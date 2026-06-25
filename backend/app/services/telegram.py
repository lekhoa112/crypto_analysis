import httpx

from app.core.config import get_settings


class TelegramService:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def enabled(self) -> bool:
        return bool(self.settings.telegram_bot_token and self.settings.telegram_chat_id)

    async def send_alert(self, message: str) -> bool:
        if not self.enabled:
            return False

        url = f"https://api.telegram.org/bot{self.settings.telegram_bot_token}/sendMessage"
        payload = {
            "chat_id": self.settings.telegram_chat_id,
            "text": message,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }

        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            return True


telegram_service = TelegramService()
