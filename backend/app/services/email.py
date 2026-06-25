import logging

logger = logging.getLogger("crypto_analysis.email")


async def send_password_reset_email(email: str, reset_token: str) -> None:
    reset_link = f"http://127.0.0.1:8010/reset-password?token={reset_token}"
    logger.warning("Mock password reset email to %s: %s", email, reset_link)
