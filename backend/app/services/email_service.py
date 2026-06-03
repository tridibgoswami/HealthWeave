"""
HealthWeave – Email Delivery Service (Resend)
Handles all transactional email: password reset, welcome.
Free tier: 3,000 emails/month, no expiry — resend.com
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


async def send_password_reset(email: str, reset_token: str, first_name: str = "") -> bool:
    """
    Send password-reset email with a signed reset link.
    Returns True on success, False on failure (never raises — email must not block auth flow).
    """
    from app.core.config import settings

    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured — password reset email not sent for %s", email)
        return False

    reset_url = f"{settings.APP_BASE_URL}/reset-password?token={reset_token}"
    greeting = f"Hi {first_name}," if first_name else "Hi,"

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F1F5F9;margin:0;padding:40px 20px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#060D1F,#0F2040);padding:32px 40px">
        <div style="color:#fff;font-size:20px;font-weight:800">HealthWeave</div>
        <div style="color:rgba(255,255,255,.5);font-size:11px;margin-top:2px">AI Health Intelligence Platform</div>
      </div>
      <div style="padding:36px 40px">
        <p style="color:#0F172A;font-size:16px;font-weight:700;margin:0 0 8px">{greeting}</p>
        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 28px">
          We received a request to reset your HealthWeave password.
          Click the button below to choose a new password. This link expires in <strong>2 hours</strong>.
        </p>
        <a href="{reset_url}"
           style="display:inline-block;background:linear-gradient(135deg,#2563EB,#0891B2);color:#fff;
                  text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:700">
          Reset My Password
        </a>
        <p style="color:#94A3B8;font-size:12px;margin-top:28px;line-height:1.6">
          If you didn't request this, you can safely ignore this email — your password won't change.<br>
          For security: this link can only be used once and expires in 2 hours.
        </p>
        <p style="color:#CBD5E1;font-size:11px;margin-top:24px;padding-top:20px;border-top:1px solid #E2E8F0">
          HealthWeave · DPDP 2023 Compliant · AES-256 Encrypted<br>
          © 2026 HealthWeave Technologies Pvt. Ltd.
        </p>
      </div>
    </div>
    </body>
    </html>
    """

    return await _send(
        to_email=email,
        subject="Reset your HealthWeave password",
        html_body=html_body,
    )


async def send_welcome(email: str, first_name: str) -> bool:
    """Send welcome email after successful registration."""
    from app.core.config import settings

    if not settings.RESEND_API_KEY:
        logger.debug("RESEND_API_KEY not configured — welcome email skipped for %s", email)
        return False

    app_url = settings.APP_BASE_URL

    html_body = f"""
    <!DOCTYPE html>
    <html>
    <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F1F5F9;margin:0;padding:40px 20px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08)">
      <div style="background:linear-gradient(135deg,#060D1F,#0F2040);padding:32px 40px">
        <div style="color:#fff;font-size:20px;font-weight:800">HealthWeave</div>
        <div style="color:rgba(255,255,255,.5);font-size:11px;margin-top:2px">Your lifelong health story, starts today.</div>
      </div>
      <div style="padding:36px 40px">
        <p style="color:#0F172A;font-size:18px;font-weight:800;margin:0 0 8px">Welcome, {first_name}! 👋</p>
        <p style="color:#475569;font-size:14px;line-height:1.7;margin:0 0 24px">
          Your HealthWeave account is ready. Here's what you can do right now:
        </p>
        <div style="background:#F8FAFC;border-radius:10px;padding:20px;margin-bottom:24px">
          <div style="margin-bottom:12px;color:#334155;font-size:13px">📄 <strong>Upload your first health record</strong> — lab reports, prescriptions, scans</div>
          <div style="margin-bottom:12px;color:#334155;font-size:13px">🧠 <strong>Chat with your AI health assistant</strong> — ask anything about your health data</div>
          <div style="margin-bottom:12px;color:#334155;font-size:13px">🆘 <strong>Set up your Emergency Passport</strong> — QR code for emergency situations</div>
          <div style="color:#334155;font-size:13px">📊 <strong>Track your vitals</strong> — blood sugar, BP, weight over time</div>
        </div>
        <a href="{app_url}"
           style="display:inline-block;background:linear-gradient(135deg,#2563EB,#0891B2);color:#fff;
                  text-decoration:none;padding:14px 28px;border-radius:10px;font-size:14px;font-weight:700">
          Go to Dashboard
        </a>
        <p style="color:#CBD5E1;font-size:11px;margin-top:32px;padding-top:20px;border-top:1px solid #E2E8F0">
          HealthWeave AI is for informational purposes only and does not replace medical advice.<br>
          © 2026 HealthWeave Technologies Pvt. Ltd. · DPDP 2023 Compliant
        </p>
      </div>
    </div>
    </body>
    </html>
    """

    return await _send(
        to_email=email,
        subject=f"Welcome to HealthWeave, {first_name}!",
        html_body=html_body,
    )


async def _send(to_email: str, subject: str, html_body: str) -> bool:
    """Core delivery via Resend API."""
    try:
        import resend
        from app.core.config import settings

        resend.api_key = settings.RESEND_API_KEY

        params: resend.Emails.SendParams = {
            "from": f"{settings.FROM_NAME} <{settings.FROM_EMAIL}>",
            "to": [to_email],
            "subject": subject,
            "html": html_body,
        }
        email = resend.Emails.send(params)
        logger.info("Email sent to %s via Resend (id=%s)", to_email, email.get("id"))
        return True

    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to_email, exc)
        return False
