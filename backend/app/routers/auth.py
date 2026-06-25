from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.db import get_db
from app.dependencies import current_user
from app.models import User
from app.schemas_auth import (
    CaptchaChallenge,
    ForgotPasswordRequest,
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenPair,
    UserRead,
)
from app.services.auth import (
    ClientContext,
    FORGOT_PASSWORD_MESSAGE,
    GENERIC_LOGIN_ERROR,
    LOCKED_LOGIN_ERROR,
    check_register_rate_limit,
    clear_login_failures,
    create_access_token,
    create_captcha_challenge,
    create_password_reset_token,
    create_refresh_token,
    find_password_reset_token,
    find_refresh_token,
    hash_password,
    is_login_locked,
    now_utc,
    password_reset_token_is_valid,
    record_login_failure,
    refresh_token_is_valid,
    revoke_all_user_refresh_tokens,
    revoke_refresh_token,
    verify_captcha,
    verify_password,
    write_security_log,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def request_context(request: Request) -> ClientContext:
    forwarded_for = request.headers.get("x-forwarded-for")
    ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else request.client.host if request.client else None
    return ClientContext(ip_address=ip_address, user_agent=request.headers.get("user-agent"))


def require_valid_captcha(token: str, answer: str) -> None:
    if not verify_captcha(token, answer):
        raise HTTPException(status_code=400, detail="Captcha khong hop le hoac da het han")


@router.get("/captcha", response_model=CaptchaChallenge)
async def captcha() -> CaptchaChallenge:
    token, question, expires_in = create_captcha_challenge()
    return CaptchaChallenge(token=token, question=question, expires_in=expires_in)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, request: Request, db: AsyncSession = Depends(get_db)) -> User:
    context = request_context(request)
    require_valid_captcha(payload.captcha_token, payload.captcha_answer)
    if not check_register_rate_limit(context.ip_address):
        raise HTTPException(status_code=429, detail="Không thể xử lý yêu cầu lúc này")

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        full_name=payload.full_name,
        status="active",
    )
    db.add(user)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Không thể tạo tài khoản")

    await write_security_log(db, "register", context, user.id)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    context = request_context(request)
    require_valid_captcha(payload.captcha_token, payload.captcha_answer)
    email = payload.email.lower()

    if is_login_locked(email, context.ip_address):
        await write_security_log(db, "account_locked", context)
        await db.commit()
        raise HTTPException(status_code=423, detail=LOCKED_LOGIN_ERROR)

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user and user.locked_until and user.locked_until > now_utc():
        await write_security_log(db, "account_locked", context, user.id)
        await db.commit()
        raise HTTPException(status_code=423, detail=LOCKED_LOGIN_ERROR)

    valid_password = bool(user and verify_password(payload.password, user.password_hash))
    user_allowed = bool(user and user.status == "active")

    if not valid_password or not user_allowed:
        locked = record_login_failure(email, context.ip_address)
        if user:
            user.failed_login_count += 1
            await write_security_log(db, "login_failed", context, user.id)
            if locked:
                user.locked_until = now_utc() + timedelta(minutes=settings.auth_lockout_minutes)
                await write_security_log(db, "account_locked", context, user.id)
        else:
            await write_security_log(db, "login_failed", context)
        await db.commit()
        if locked:
            raise HTTPException(status_code=423, detail=LOCKED_LOGIN_ERROR)
        raise HTTPException(status_code=401, detail=GENERIC_LOGIN_ERROR)

    clear_login_failures(email, context.ip_address)
    user.failed_login_count = 0
    user.locked_until = None
    user.last_login_at = now_utc()

    access_token = create_access_token(user)
    refresh_token, _ = await create_refresh_token(db, user, context)
    await write_security_log(db, "login_success", context, user.id)
    await db.commit()

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_minutes * 60,
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, request: Request, db: AsyncSession = Depends(get_db)) -> TokenPair:
    context = request_context(request)
    old_token = await find_refresh_token(db, payload.refresh_token)
    if not old_token or not refresh_token_is_valid(old_token):
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = await db.get(User, old_token.user_id)
    if not user or user.status != "active":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    old_token.revoked_at = now_utc()
    new_raw_token, new_token = await create_refresh_token(db, user, context)
    old_token.replaced_by_token_id = new_token.id
    await write_security_log(db, "refresh_token_used", context, user.id)
    await write_security_log(db, "refresh_token_revoked", context, user.id)
    await db.commit()

    return TokenPair(
        access_token=create_access_token(user),
        refresh_token=new_raw_token,
        expires_in=settings.access_token_minutes * 60,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(payload: LogoutRequest, request: Request, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    context = request_context(request)
    refresh_token = await find_refresh_token(db, payload.refresh_token)
    if refresh_token and refresh_token.revoked_at is None:
        await revoke_refresh_token(db, refresh_token, context)
        await write_security_log(db, "logout", context, refresh_token.user_id)
        await db.commit()
    return MessageResponse(message="Đã đăng xuất")


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    context = request_context(request)
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if user:
        await create_password_reset_token(db, user)
        await write_security_log(db, "forgot_password_requested", context, user.id)
    else:
        await write_security_log(db, "forgot_password_requested", context)

    await db.commit()
    return MessageResponse(message=FORGOT_PASSWORD_MESSAGE)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    context = request_context(request)
    reset_token = await find_password_reset_token(db, payload.token)
    if not reset_token or not password_reset_token_is_valid(reset_token):
        raise HTTPException(status_code=400, detail="Token không hợp lệ hoặc đã hết hạn")

    user = await db.get(User, reset_token.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Token không hợp lệ hoặc đã hết hạn")

    user.password_hash = hash_password(payload.password)
    user.failed_login_count = 0
    user.locked_until = None
    reset_token.used_at = now_utc()
    await revoke_all_user_refresh_tokens(db, user.id)
    await write_security_log(db, "password_reset_success", context, user.id)
    await db.commit()
    return MessageResponse(message="Đặt lại mật khẩu thành công")


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(current_user)) -> User:
    return user
