from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.cookies import (
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    clear_auth_cookies,
    cookie_max_age_seconds,
    set_auth_cookies,
)
from app.core.deps import get_current_user, get_db, get_optional_user
from app.core.rate_limit import enforce_login_rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    safe_decode,
    verify_password,
)
from app.models.operational import AccessTokenDenylist
from app.models.session import AuthSession
from app.models.user import User
from app.schemas.auth import LoginRequest, MessageOut, RefreshRequest, TokenPair, UserOut
from app.services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])


def _permissions_for(user: User) -> list[str]:
    codes: set[str] = set()
    for role in user.roles:
        for perm in role.permissions:
            codes.add(perm.code)
    return sorted(codes)


def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        department=user.department,
        is_active=user.is_active,
        is_manager=user.is_manager,
        roles=[r.name for r in user.roles],
        permissions=_permissions_for(user),
    )


def _find_user_by_login(db: Session, identifier: str) -> User | None:
    value = identifier.strip()
    if not value:
        return None
    lowered = value.lower()
    return (
        db.query(User)
        .filter(
            or_(
                func.lower(User.username) == lowered,
                func.lower(User.email) == lowered,
            )
        )
        .first()
    )


def _issue_tokens(
    db: Session,
    user: User,
    *,
    request: Request | None = None,
    remember_days: int | None = None,
) -> TokenPair:
    refresh, jti, expires_at = create_refresh_token(
        user.id, expire_days=remember_days
    )
    ua = None
    ip = None
    if request is not None:
        ip = request.client.host if request.client else None
        ua = (request.headers.get("user-agent") or "")[:255] or None

    db.add(
        AuthSession(
            user_id=user.id,
            refresh_jti=jti,
            expires_at=expires_at,
            ip_address=ip,
            user_agent=ua,
        )
    )
    db.commit()

    return TokenPair(
        access_token=create_access_token(
            user.id,
            {"username": user.username, "roles": [r.name for r in user.roles]},
        ),
        refresh_token=refresh,
    )


def _attach_cookies(
    response: Response,
    tokens: TokenPair,
    *,
    remember_me: bool = False,
) -> TokenPair:
    settings = get_settings()
    refresh_days = (
        max(settings.refresh_token_expire_days, 30)
        if remember_me
        else settings.refresh_token_expire_days
    )
    set_auth_cookies(
        response,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        access_max_age=cookie_max_age_seconds(
            minutes=settings.access_token_expire_minutes
        ),
        refresh_max_age=cookie_max_age_seconds(days=refresh_days),
        secure=settings.grcx_env == "production",
    )
    # SPA auth is cookie-only: keep access/refresh in HttpOnly cookies.
    # Do not echo raw tokens in the JSON body (empty strings for TokenPair shape).
    return TokenPair(access_token="", refresh_token="", token_type=tokens.token_type)


def _authenticate(db: Session, identifier: str, password: str) -> User:
    user = _find_user_by_login(db, identifier)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return user


@router.post("/login", response_model=TokenPair)
def login_json(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> TokenPair:
    """JSON login — preferred for the GRCx SPA (sets HttpOnly cookies)."""
    enforce_login_rate_limit(request)
    user = _authenticate(db, body.email, body.password)
    write_audit(
        db,
        action="auth.login",
        actor_id=user.id,
        actor_name=user.full_name,
        ip_address=request.client.host if request.client else None,
    )
    tokens = _issue_tokens(
        db,
        user,
        request=request,
        remember_days=(30 if body.remember_me else None),
    )
    return _attach_cookies(response, tokens, remember_me=body.remember_me)


@router.post("/token", response_model=TokenPair, include_in_schema=False)
def login_oauth_form(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenPair:
    """OAuth2 password form (Swagger / tooling)."""
    enforce_login_rate_limit(request)
    user = _authenticate(db, form_data.username, form_data.password)
    write_audit(
        db,
        action="auth.login",
        actor_id=user.id,
        actor_name=user.full_name,
        ip_address=request.client.host if request.client else None,
    )
    tokens = _issue_tokens(db, user, request=request)
    return _attach_cookies(response, tokens)


@router.post("/refresh", response_model=TokenPair)
def refresh(
    request: Request,
    response: Response,
    body: RefreshRequest | None = None,
    db: Session = Depends(get_db),
) -> TokenPair:
    raw = None
    if body and body.refresh_token:
        raw = body.refresh_token
    if not raw:
        raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status_code=401, detail="Missing refresh token")

    payload = safe_decode(raw)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    jti = payload.get("jti")
    user_id = payload.get("sub")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Invalid user")

    if not jti:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    session = (
        db.query(AuthSession)
        .filter(AuthSession.refresh_jti == jti, AuthSession.user_id == user.id)
        .first()
    )
    if not session or session.revoked_at is not None:
        raise HTTPException(status_code=401, detail="Session revoked")
    if session.expires_at is not None:
        exp = session.expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Session expired")
    session.revoked_at = datetime.now(timezone.utc)
    db.commit()

    tokens = _issue_tokens(db, user, request=request)
    return _attach_cookies(response, tokens)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> UserOut:
    return _user_out(user)


@router.post("/logout", response_model=MessageOut)
def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
) -> MessageOut:
    access_raw = request.cookies.get(ACCESS_COOKIE)
    if access_raw:
        access_payload = safe_decode(access_raw)
        if access_payload and access_payload.get("type") == "access":
            jti = access_payload.get("jti")
            exp = access_payload.get("exp")
            if jti and exp is not None:
                try:
                    expires_at = datetime.fromtimestamp(int(exp), tz=timezone.utc)
                except (TypeError, ValueError, OSError):
                    expires_at = datetime.now(timezone.utc)
                existing = db.get(AccessTokenDenylist, jti)
                if existing is None:
                    db.add(AccessTokenDenylist(jti=jti, expires_at=expires_at))

    refresh_raw = request.cookies.get(REFRESH_COOKIE)
    if refresh_raw and user:
        payload = safe_decode(refresh_raw)
        jti = payload.get("jti") if payload else None
        if jti:
            session = (
                db.query(AuthSession)
                .filter(
                    AuthSession.refresh_jti == jti,
                    AuthSession.user_id == user.id,
                    AuthSession.revoked_at.is_(None),
                )
                .first()
            )
            if session:
                session.revoked_at = datetime.now(timezone.utc)

    if user:
        write_audit(
            db,
            action="auth.logout",
            actor_id=user.id,
            actor_name=user.full_name,
        )
    db.commit()

    clear_auth_cookies(response)
    return MessageOut(ok=True)
