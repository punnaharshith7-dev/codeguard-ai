import smtplib
from email.message import EmailMessage

from app.core.config import settings


def send_password_reset(email: str, token: str) -> None:
    if not settings.smtp_host or not settings.smtp_from:
        return
    message = EmailMessage()
    message["Subject"] = "Reset your CodeGuard AI password"
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content(
        "Use this one-time link to reset your password:\n"
        f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}\n\n"
        "If you did not request this, you can ignore this email."
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=10) as server:
        server.starttls()
        if settings.smtp_username:
            server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)

