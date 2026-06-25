import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.models import Transaction, Wallet
from app.schemas import AlertRead, TransactionWebhook
from app.services.alerts import create_alert_if_needed

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
async def receive_transaction_webhook(
    payload: TransactionWebhook,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    wallet_address = payload.wallet_address.lower()
    wallet_result = await db.execute(
        select(Wallet).where(
            Wallet.address == wallet_address,
            Wallet.chain == payload.chain,
            Wallet.is_active.is_(True),
        )
    )
    wallet = wallet_result.scalar_one_or_none()

    transaction_data = {
        "tx_hash": payload.tx_hash,
        "chain": payload.chain,
        "wallet_address": wallet_address,
        "wallet_id": wallet.id if wallet else None,
        "token_symbol": payload.token_symbol.upper(),
        "token_address": payload.token_address,
        "amount": payload.amount,
        "usd_value": payload.usd_value,
        "direction": payload.direction,
        "raw_payload": json.dumps(await request.json()),
    }
    if payload.created_at is not None:
        transaction_data["created_at"] = payload.created_at

    transaction = Transaction(
        **transaction_data,
    )
    db.add(transaction)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Transaction already exists")

    alert = await create_alert_if_needed(db, transaction)
    if alert is None:
        await db.commit()

    return {
        "transaction_id": str(transaction.id),
        "alert_created": alert is not None,
        "alert": AlertRead.model_validate(alert).model_dump(mode="json") if alert else None,
    }
