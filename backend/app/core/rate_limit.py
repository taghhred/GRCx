"""Simple in-memory rate limiter (per client IP + bucket)."""
from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock

from fastapi import HTTPException, Request, status

_lock = Lock()
_hits: dict[str, deque[float]] = defaultdict(deque)


def enforce_named_rate_limit(
    request: Request,
    bucket: str,
    *,
    max_attempts: int = 20,
    window_seconds: float = 60.0,
) -> None:
    ip = request.client.host if request.client else "unknown"
    key = f"{bucket}:{ip}"
    now = time.monotonic()
    with _lock:
        q = _hits[key]
        while q and (now - q[0]) > window_seconds:
            q.popleft()
        if len(q) >= max_attempts:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Try again shortly.",
            )
        q.append(now)


def enforce_login_rate_limit(request: Request) -> None:
    enforce_named_rate_limit(request, "login", max_attempts=20, window_seconds=60.0)
