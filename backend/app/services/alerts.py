from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert, Transaction
from app.services.settings import get_alert_threshold
from app.services.telegram import telegram_service
from app.services.websocket_manager import websocket_manager


def _format_usd(value: float) -> str:
    return f"${value:,.0f}"


def build_alert_message(transaction: Transaction, threshold: float) -> tuple[str, str]:
    title = f"Whale Alert: {transaction.token_symbol} {_format_usd(transaction.usd_value)}"
    direction = transaction.direction.value.upper()
    message = (
        f"{direction} {transaction.amount:,.6f} {transaction.token_symbol} "
        f"on {transaction.chain} worth {_format_usd(transaction.usd_value)}.\n"
        f"Wallet: {transaction.wallet_address}\n"
        f"Tx: {transaction.tx_hash}\n"
        f"Threshold: {_format_usd(threshold)}"
    )
    return title, message


async def create_alert_if_needed(db: AsyncSession, transaction: Transaction) -> Alert | None:
    threshold = await get_alert_threshold(db)
    if transaction.usd_value < threshold:
        return None

    title, message = build_alert_message(transaction, threshold)
    alert = Alert(
        transaction_id=transaction.id,
        wallet_address=transaction.wallet_address,
        chain=transaction.chain,
        title=title,
        message=message,
        usd_value=transaction.usd_value,
    )
    db.add(alert)
    await db.flush()

    sent_telegram = False
    if transaction.usd_value >= threshold:
        try:
            sent_telegram = await telegram_service.send_alert(message)
        except Exception:
            sent_telegram = False

    alert.sent_telegram = sent_telegram
    await db.commit()
    await db.refresh(alert)

    await websocket_manager.broadcast(
        {
            "type": "alert",
            "data": {
                "id": str(alert.id),
                "transaction_id": str(alert.transaction_id),
                "wallet_address": alert.wallet_address,
                "chain": alert.chain,
                "title": alert.title,
                "message": alert.message,
                "usd_value": alert.usd_value,
                "sent_telegram": alert.sent_telegram,
                "created_at": alert.created_at.isoformat(),
            },
        }
    )
    return alert
