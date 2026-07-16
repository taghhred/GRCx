import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import get_settings

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def new_jti() -> str:
    return str(uuid.uuid4())


def create_access_token(subject: str, extra: dict[str, Any] | None = None) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload: dict[str, Any] = {"sub": subject, "exp": expire, "type": "access"}
    if extra:
        payload.update(extra)
    if "jti" not in payload:
        payload["jti"] = new_jti()
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_refresh_token(
    subject: str,
    *,
    jti: str | None = None,
    expire_days: int | None = None,
) -> tuple[str, str, datetime]:
    """Return (token, jti, expires_at)."""
    settings = get_settings()
    days = expire_days if expire_days is not None else settings.refresh_token_expire_days
    expire = datetime.now(timezone.utc) + timedelta(days=days)
    token_jti = jti or new_jti()
    payload = {
        "sub": subject,
        "exp": expire,
        "type": "refresh",
        "jti": token_jti,
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
    return token, token_jti, expire


def decode_token(token: str) -> dict[str, Any]:
    settings = get_settings()
    return jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])


def safe_decode(token: str) -> dict[str, Any] | None:
    try:
        return decode_token(token)
    except JWTError:
        return None
