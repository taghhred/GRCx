from collections.abc import Generator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.cookies import ACCESS_COOKIE
from app.core.security import safe_decode
from app.db.session import SessionLocal
from app.models.operational import AccessTokenDenylist
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _extract_access_token(
    request: Request,
    bearer: str | None,
) -> str | None:
    if bearer:
        return bearer
    return request.cookies.get(ACCESS_COOKIE)


def _resolve_open_demo_user(db: Session) -> User | None:
    """Hackathon open access: resolve seeded demo identity (no client-supplied id)."""
    from app.services.bootstrap import DEMO_USER_EMAIL, seed_rbac_and_demo_user

    settings = get_settings()
    if not settings.demo_mode:
        return None
    seed_rbac_and_demo_user(db)
    user = db.query(User).filter(User.email == DEMO_USER_EMAIL).first()
    if user is None or not user.is_active:
        return None
    return user


def get_current_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    access = _extract_access_token(request, token)
    if not access:
        demo = _resolve_open_demo_user(db)
        if demo is not None:
            return demo
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    payload = safe_decode(access)
    if not payload or payload.get("type") != "access":
        demo = _resolve_open_demo_user(db)
        if demo is not None:
            return demo
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    jti = payload.get("jti")
    if jti and db.get(AccessTokenDenylist, jti) is not None:
        demo = _resolve_open_demo_user(db)
        if demo is not None:
            return demo
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token revoked",
        )
    user_id = payload.get("sub")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        demo = _resolve_open_demo_user(db)
        if demo is not None:
            return demo
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User inactive or not found",
        )
    return user


def get_optional_user(
    request: Request,
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User | None:
    try:
        return get_current_user(request=request, token=token, db=db)
    except HTTPException:
        return None


def require_roles(*roles: str):
    def _checker(user: User = Depends(get_current_user)) -> User:
        names = {r.name for r in user.roles}
        if "Admin" in names:
            return user
        if not names.intersection(set(roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient role",
            )
        return user

    return _checker


def require_permissions(*codes: str):
    """RBAC foundation: Admin bypasses; otherwise require any listed permission."""

    def _checker(user: User = Depends(get_current_user)) -> User:
        role_names = {r.name for r in user.roles}
        if "Admin" in role_names:
            return user
        held: set[str] = set()
        for role in user.roles:
            for perm in role.permissions:
                held.add(perm.code)
        if not held.intersection(set(codes)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permission",
            )
        return user

    return _checker


def settings_dep():
    return get_settings()
