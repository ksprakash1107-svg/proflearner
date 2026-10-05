from email.message import EmailMessage

import aiosmtplib

from app.core.config import get_settings
from app.core.logging import logger


class EmailService:
    def __init__(self) -> None:
        self.settings = get_settings()

    async def send_password_reset_email(self, to_email: str, reset_token: str) -> None:
        reset_link = f"{self.settings.FRONTEND_BASE_URL}/reset-password?token={reset_token}"
        msg = EmailMessage()
        msg["From"] = self.settings.SMTP_FROM
        msg["To"] = to_email
        msg["Subject"] = f"Reset your {self.settings.APP_NAME} password"

        msg.set_content(
            f"Hello,\n\n"
            f"We received a request to reset your password for your {self.settings.APP_NAME} account.\n"
            f"Please click the link below to set a new password:\n\n"
            f"{reset_link}\n\n"
            f"This link will expire in 1 hour. If you did not request this, you can ignore this message.\n\n"
            f"Best regards,\n"
            f"The {self.settings.APP_NAME} Team\n"
        )

        if self.settings.APP_ENV == "test":
            logger.info("email_simulated_in_test", to=to_email, reset_link=reset_link)
            return

        try:
            await aiosmtplib.send(
                msg,
                hostname=self.settings.SMTP_HOST,
                port=self.settings.SMTP_PORT,
                username=self.settings.SMTP_USER or None,
                password=self.settings.SMTP_PASSWORD or None,
                use_tls=self.settings.SMTP_TLS,
                timeout=10,
            )
            logger.info("password_reset_email_sent", to=to_email)
        except Exception as e:
            logger.warning("email_send_failed", error=str(e), to=to_email)
