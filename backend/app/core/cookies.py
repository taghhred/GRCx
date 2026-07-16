from datetime import timedelta

from fastapi import Response

ACCESS_COOKIE = "grcx_access"
REFRESH_COOKIE = "grcx_refresh"


def set_auth_cookies(
    response: Response,
    *,
    access_token: str,
    refresh_token: str,
    access_max_age: int,
    refresh_max_age: int,
    secure: bool = False,
) -> None:
    """HttpOnly session cookies — not readable by JavaScript.

    Production (secure=True) uses SameSite=None so the Vercel SPA can
    authenticate against the Railway API on a different site.
    """
    # Cross-origin SPA (Vercel) → API (Railway) requires SameSite=None + Secure.
    samesite = "none" if secure else "lax"
    response.set_cookie(
        key=ACCESS_COOKIE,
        value=access_token,
        max_age=access_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=refresh_max_age,
        httponly=True,
        secure=secure,
        samesite=samesite,
        path="/",
    )


def clear_auth_cookies(response: Response, *, secure: bool = False) -> None:
    samesite = "none" if secure else "lax"
    response.delete_cookie(
        ACCESS_COOKIE, path="/", secure=secure, httponly=True, samesite=samesite
    )
    response.delete_cookie(
        REFRESH_COOKIE, path="/", secure=secure, httponly=True, samesite=samesite
    )


def cookie_max_age_seconds(*, minutes: int = 0, days: int = 0) -> int:
    return int(timedelta(minutes=minutes, days=days).total_seconds())
