#!/usr/bin/env python3
"""Full-stack AI advisor trace: login -> backend -> AI."""
from __future__ import annotations

import json
import sys
import traceback
import urllib.error
import urllib.request

API = "http://127.0.0.1:8002/api/v1"
AI = "http://127.0.0.1:8001"
AI_TOKEN = "EqXnhCU8wO5WXZPXtTeAOIMiMvcaa_Kf2D-pwtvNnNQ"


def req(method: str, url: str, body: dict | None = None, headers: dict | None = None):
    h = dict(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        h.setdefault("Content-Type", "application/json")
    r = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r, timeout=180) as resp:
            raw = resp.read().decode("utf-8")
            return resp.status, json.loads(raw) if raw else {}, dict(resp.headers)
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return e.code, payload, dict(e.headers)


def main() -> int:
    print("=== 1. AI direct ===")
    for path in ["/health", "/ready"]:
        code, data, _ = req("GET", AI + path)
        print(f"  {path}: HTTP {code} model_loaded={data.get('model_loaded')}")

    code, data, _ = req(
        "POST",
        AI + "/advisor/chat",
        {"message": "What is IAM?", "history": [], "module": "Dashboard", "lang": "en"},
        {"X-GRCx-AI-Token": AI_TOKEN},
    )
    print(f"  /advisor/chat: HTTP {code} reply_len={len(data.get('reply',''))}")

    print("\n=== 2. Backend login ===")
    code, login, hdrs = req(
        "POST",
        API + "/auth/login",
        {"email": "test@grcx.local", "password": "123456"},
    )
    print(f"  login: HTTP {code}")
    if code != 200:
        print(json.dumps(login, indent=2))
        return 1

    cookies = hdrs.get("Set-Cookie") or hdrs.get("set-cookie") or ""
    cookie_header = ""
    for part in cookies.split(","):
        if "access_token=" in part or "grcx_access=" in part:
            cookie_header = part.split(";")[0].strip()
            break
    # urllib may not give all cookies easily - use requests alternative via cookie jar
    import http.cookiejar

    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    login_req = urllib.request.Request(
        API + "/auth/login",
        data=json.dumps({"email": "test@grcx.local", "password": "123456"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with opener.open(login_req, timeout=30) as resp:
        print(f"  login cookie jar: {len(cj)} cookies")
        csrf = None
        for c in cj:
            print(f"    cookie: {c.name} domain={c.domain}")
            if c.name.lower() in ("csrf_token", "grcx_csrf", "X-GRCx-CSRF"):
                csrf = c.value

    advisor_headers = {"Content-Type": "application/json", "X-GRCx-CSRF": "1"}
    advisor_body = json.dumps(
        {
            "message": "What is IAM?",
            "history": [],
            "module": "Dashboard",
            "lang": "en",
            "page_context": {"moduleLabel": "Dashboard"},
        }
    ).encode()
    advisor_req = urllib.request.Request(
        API + "/ai/advisor/chat",
        data=advisor_body,
        headers=advisor_headers,
        method="POST",
    )
    try:
        with opener.open(advisor_req, timeout=180) as resp:
            body = json.loads(resp.read().decode())
            print(f"\n=== 3. Backend /ai/advisor/chat: HTTP {resp.status} ===")
            print(f"  reply preview: {body.get('reply','')[:200]}")
            print(f"  sources: {len(body.get('sources') or [])}")
            print(f"  model: {body.get('model')}")
            return 0
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace")
        print(f"\n=== 3. Backend /ai/advisor/chat FAILED: HTTP {e.code} ===")
        print(raw)
        return 1
    except Exception:
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
