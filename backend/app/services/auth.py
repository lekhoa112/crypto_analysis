import hashlib
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from jose import JWTError, jwt
import bcrypt
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models import PasswordResetToken, RefreshToken, SecurityLog, User
from app.services.email import send_password_reset_email

settings = get_settings()

GENERIC_LOGIN_ERROR = "Email hoặc mật khẩu không đúng"
FORGOT_PASSWORD_MESSAGE = "Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu"


@dataclass
class ClientContext:
    ip_address: str | None
    user_agent: str | None


_register_attempts: dict[str, list[datetime]] = {}
_login_failures: dict[str, list[datetime]] = {}
_lockouts: dict[str, datetime] = {}


def now_utc() -> datetime:
    return datetime.now(UTC)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(user: User) -> str:
    expires_at = now_utc() + timedelta(minutes=settings.access_token_minutes)
    payload = {
        "sub": str(user.id),
        "email": user.email,
        "type": "access",
        "exp": expires_at,
        "iat": now_utc(),
        "jti": str(uuid4()),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
    if payload.get("type") != "access":
        raise ValueError("Invalid token type")
    return payload


def generate_secure_token() -> str:
    return secrets.token_urlsafe(48)


def _prune_attempts(key: str, store: dict[str, list[datetime]]) -> list[datetime]:
    cutoff = now_utc() - timedelta(seconds=settings.auth_rate_limit_window_seconds)
    attempts = [item for item in store.get(key, []) if item > cutoff]
    store[key] = attempts
    return attempts


def check_register_rate_limit(ip_address: str | None) -> bool:
    key = ip_address or "unknown"
    attempts = _prune_attempts(key, _register_attempts)
    if len(attempts) >= settings.auth_register_max_attempts:
        return False
    attempts.append(now_utc())
    _register_attempts[key] = attempts
    return True


def _login_key(email: str, ip_address: str | None) -> str:
    return f"{email.lower()}:{ip_address or 'unknown'}"


def is_login_locked(email: str, ip_address: str | None) -> bool:
    key = _login_key(email, ip_address)
    locked_until = _lockouts.get(key)
    if locked_until and locked_until > now_utc():
        return True
    if locked_until:
        _lockouts.pop(key, None)
    return False


def record_login_failure(email: str, ip_address: str | None) -> bool:
    key = _login_key(email, ip_address)
    failures = _prune_attempts(key, _login_failures)
    failures.append(now_utc())
    _login_failures[key] = failures
    if len(failures) >= settings.auth_login_max_failures:
        _lockouts[key] = now_utc() + timedelta(minutes=settings.auth_lockout_minutes)
        return True
    return False


def clear_login_failures(email: str, ip_address: str | None) -> None:
    key = _login_key(email, ip_address)
    _login_failures.pop(key, None)
    _lockouts.pop(key, None)


async def write_security_log(
    db: AsyncSession,
    event_type: str,
    context: ClientContext,
    user_id=None,
) -> None:
    db.add(
        SecurityLog(
            user_id=user_id,
            event_type=event_type,
            ip_address=context.ip_address,
            user_agent=context.user_agent,
        )
    )
    await db.flush()


async def create_refresh_token(db: AsyncSession, user: User, context: ClientContext) -> tuple[str, RefreshToken]:
    raw_token = generate_secure_token()
    refresh_token = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=now_utc() + timedelta(days=settings.refresh_token_days),
        ip_address=context.ip_address,
        user_agent=context.user_agent,
    )
    db.add(refresh_token)
    await db.flush()
    return raw_token, refresh_token


async def find_refresh_token(db: AsyncSession, raw_token: str) -> RefreshToken | None:
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == hash_token(raw_token)))
    return result.scalar_one_or_none()


def refresh_token_is_valid(refresh_token: RefreshToken) -> bool:
    return refresh_token.revoked_at is None and refresh_token.expires_at > now_utc()


async def revoke_refresh_token(db: AsyncSession, refresh_token: RefreshToken, context: ClientContext) -> None:
    refresh_token.revoked_at = now_utc()
    await write_security_log(db, "refresh_token_revoked", context, refresh_token.user_id)


async def revoke_all_user_refresh_tokens(db: AsyncSession, user_id) -> None:
    await db.execute(
        update(RefreshToken)
        .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
        .values(revoked_at=now_utc())
    )


async def create_password_reset_token(db: AsyncSession, user: User) -> str:
    raw_token = generate_secure_token()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            expires_at=now_utc() + timedelta(minutes=settings.password_reset_minutes),
        )
    )
    await db.flush()
    await send_password_reset_email(user.email, raw_token)
    return raw_token


async def find_password_reset_token(db: AsyncSession, raw_token: str) -> PasswordResetToken | None:
    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == hash_token(raw_token))
    )
    return result.scalar_one_or_none()


def password_reset_token_is_valid(token: PasswordResetToken) -> bool:
    return token.used_at is None and token.expires_at > now_utc()
