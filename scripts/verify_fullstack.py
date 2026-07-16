"""Verify fullstack APIs after production-like backend wiring."""
from __future__ import annotations

import json
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

API = "http://127.0.0.1:8002/api/v1"
AI = "http://127.0.0.1:8001"
FAIL = 0


def ok(msg: str) -> None:
    print("PASS", msg)


def bad(msg: str) -> None:
    global FAIL
    FAIL += 1
    print("FAIL", msg)


def main() -> int:
    try:
        h = json.loads(urllib.request.urlopen(f"{AI}/health", timeout=20).read())
        if h.get("model_loaded") and h.get("classifier") == "arabert":
            ok(f"AI arabert checkpoint={h.get('checkpoint')}")
        else:
            bad(f"AI health {h}")
    except Exception as e:  # noqa: BLE001
        bad(f"AI down {e}")
        return 1

    try:
        urllib.request.urlopen(f"{API}/health", timeout=10)
        ok("backend health")
    except Exception as e:  # noqa: BLE001
        bad(f"backend down {e}")
        return 1

    jar = CookieJar()
    op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    req = urllib.request.Request(
        f"{API}/auth/login",
        data=json.dumps({"email": "test@grcx.local", "password": "123456"}).encode(),
        headers={"Content-Type": "application/json", "Origin": "http://localhost:5173"},
        method="POST",
    )
    try:
        with op.open(req, timeout=20) as r:
            body = json.loads(r.read())
        if body.get("access_token") == "" and body.get("refresh_token") == "":
            ok("login cookie-only tokens")
        else:
            bad(f"tokens still exposed {body.keys()}")
    except Exception as e:  # noqa: BLE001
        bad(f"login {e}")
        return 1

    me = json.loads(op.open(urllib.request.Request(f"{API}/auth/me"), timeout=15).read())
    perms = set(me.get("permissions") or [])
    for need in ("bcm:read", "dr:read", "reports:write", "compliance:write", "identity:write"):
        if need in perms:
            ok(f"perm {need}")
        else:
            bad(f"missing perm {need}")

    for p in [
        "/dashboard/analytics",
        "/dashboard/kpis",
        "/dashboard/organization",
        "/compliance/assets",
        "/compliance/bundle",
        "/identity/monitoring",
        "/bcm/dashboard",
        "/dr/dashboard",
        "/reports",
    ]:
        try:
            with op.open(urllib.request.Request(f"{API}{p}"), timeout=30) as r:
                data = r.read()
            ok(f"{p} ({len(data)}b)")
        except urllib.error.HTTPError as e:
            bad(f"{p} HTTP {e.code} {e.read()[:160]}")
        except Exception as e:  # noqa: BLE001
            bad(f"{p} {e}")

    chat = json.dumps(
        {
            "messages": [{"role": "user", "content": "MFA missing"}],
            "page_context": {"moduleLabel": "Risk"},
        }
    ).encode()
    req = urllib.request.Request(
        f"{API}/ai/chat",
        data=chat,
        headers={"Content-Type": "application/json", "X-GRCx-CSRF": "1"},
        method="POST",
    )
    try:
        with op.open(req, timeout=90) as r:
            d = json.loads(r.read())
        if d.get("reply") and not d.get("prototype"):
            ok(f"chat provider={d.get('provider')}")
        else:
            bad(f"chat {d}")
    except Exception as e:  # noqa: BLE001
        bad(f"chat {e}")

    advisor = json.dumps(
        {
            "message": "What is IAM?",
            "history": [],
            "module": "Dashboard",
            "lang": "en",
            "page_context": {"moduleLabel": "Dashboard"},
        }
    ).encode()
    req = urllib.request.Request(
        f"{API}/ai/advisor/chat",
        data=advisor,
        headers={"Content-Type": "application/json", "X-GRCx-CSRF": "1"},
        method="POST",
    )
    try:
        with op.open(req, timeout=90) as r:
            d = json.loads(r.read())
        if d.get("reply") and d.get("provider") == "imtithal":
            ok(f"advisor grounded={d.get('grounded')} sources={len(d.get('sources') or [])}")
        else:
            bad(f"advisor {d}")
    except urllib.error.HTTPError as e:
        bad(f"advisor HTTP {e.code} {e.read()[:200]}")
    except Exception as e:  # noqa: BLE001
        bad(f"advisor {e}")

    # counts
    try:
        assets = json.loads(
            op.open(urllib.request.Request(f"{API}/compliance/assets")).read()
        )
        ids = json.loads(
            op.open(urllib.request.Request(f"{API}/identity/monitoring")).read()
        )
        bcm = json.loads(op.open(urllib.request.Request(f"{API}/bcm/dashboard")).read())
        dr = json.loads(op.open(urllib.request.Request(f"{API}/dr/dashboard")).read())
        print(
            "counts",
            "assets",
            len(assets.get("assets") or []),
            "identities",
            len(ids.get("identities") or []),
            "bcm",
            len(bcm.get("processes") or []),
            "dr",
            len(dr.get("systems") or []),
        )
    except Exception as e:  # noqa: BLE001
        bad(f"counts {e}")

    print("SUMMARY fail=", FAIL)
    return 1 if FAIL else 0


if __name__ == "__main__":
    raise SystemExit(main())
