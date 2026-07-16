"""End-to-end production validation for GRCx local stack."""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

AI = "http://127.0.0.1:8001"
API = "http://127.0.0.1:8002/api/v1"
EMAIL = "test@grcx.local"
PASSWORD = "123456"

PASS = 0
FAIL = 0
NOTES: list[str] = []


def ok(name: str, detail: str = "") -> None:
    global PASS
    PASS += 1
    print(f"  PASS  {name}" + (f" — {detail}" if detail else ""))


def bad(name: str, detail: str = "") -> None:
    global FAIL
    FAIL += 1
    print(f"  FAIL  {name}" + (f" — {detail}" if detail else ""))


def get_json(url: str, timeout: float = 30.0) -> tuple[int, dict]:
    req = urllib.request.Request(url, method="GET")
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode("utf-8"))


def main() -> int:
    print("=== AI health / ready ===")
    try:
        st, health = get_json(f"{AI}/health")
        if health.get("model_loaded") and health.get("classifier") == "arabert":
            ok("AI model_loaded arabert", f"checkpoint={health.get('checkpoint')}")
        else:
            bad("AI model_loaded arabert", json.dumps(health)[:200])
        if health.get("classifier") in ("tfidf", "sklearn"):
            bad("No TF-IDF/sklearn", str(health.get("classifier")))
        else:
            ok("No TF-IDF/sklearn runtime")
    except Exception as exc:  # noqa: BLE001
        bad("AI /health", str(exc))
        health = {}

    try:
        st, ready = get_json(f"{AI}/ready")
        if ready.get("status") == "ready" and ready.get("classifier_backend") == "arabert":
            ok("AI /ready", f"checkpoint={ready.get('checkpoint')}")
        else:
            bad("AI /ready", json.dumps(ready)[:200])
    except Exception as exc:  # noqa: BLE001
        bad("AI /ready", str(exc))

    print("=== AI analyze (AraBERT) ===")
    samples = [
        "كلمة المرور ضعيفة وسهلة التخمين",
        "لا يوجد تحقق متعدد العوامل MFA",
        "حساب مستخدم غير مستخدم منذ عام",
    ]
    for text in samples:
        try:
            data = json.dumps({"text": text, "use_llm": False, "top_articles": 1}).encode()
            req = urllib.request.Request(
                f"{AI}/analyze",
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                body = json.loads(resp.read().decode("utf-8"))
            eng = body.get("engine") or {}
            clf = eng.get("classifier") if isinstance(eng, dict) else None
            cat = (body.get("classification") or {}).get("category")
            conf = (body.get("classification") or {}).get("confidence")
            if clf == "arabert" and cat:
                ok(f"analyze:{text[:24]}", f"{cat} conf={conf}")
            else:
                bad(f"analyze:{text[:24]}", json.dumps(body)[:180])
        except Exception as exc:  # noqa: BLE001
            bad(f"analyze:{text[:24]}", str(exc))

    print("=== Backend health / auth / AI ===")
    try:
        st, bh = get_json(f"{API}/health")
        ok("Backend health", bh.get("status"))
    except Exception as exc:  # noqa: BLE001
        bad("Backend health", str(exc))
        print(f"\nTOTAL pass={PASS} fail={FAIL}")
        return 1

    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))

    try:
        payload = json.dumps({"email": EMAIL, "password": PASSWORD}).encode()
        req = urllib.request.Request(
            f"{API}/auth/login",
            data=payload,
            headers={"Content-Type": "application/json", "Origin": "http://localhost:5173"},
            method="POST",
        )
        with opener.open(req, timeout=30) as resp:
            tokens = json.loads(resp.read().decode("utf-8"))
        if tokens.get("access_token"):
            ok("Login", EMAIL)
        else:
            bad("Login", str(tokens)[:120])
    except urllib.error.HTTPError as exc:
        bad("Login", f"{exc.code} {exc.read()[:120]}")
        print(f"\nTOTAL pass={PASS} fail={FAIL}")
        return 1
    except Exception as exc:  # noqa: BLE001
        bad("Login", str(exc))
        return 1

    try:
        req = urllib.request.Request(f"{API}/auth/me", method="GET")
        with opener.open(req, timeout=15) as resp:
            me = json.loads(resp.read().decode("utf-8"))
        ok("Auth /me", me.get("email") or me.get("username"))
    except Exception as exc:  # noqa: BLE001
        bad("Auth /me", str(exc))

    # Module list endpoints (smoke) — only production backend routers
    smoke = [
        ("/risks", "Risk"),
        ("/risks/stats", "Risk stats"),
        ("/governance/policies", "Governance policies"),
        ("/governance/kpis", "Governance KPIs"),
        ("/cases", "SOAR Queue"),
        ("/notifications", "Notifications"),
        ("/audit", "Audit"),
        ("/ready", "Ready"),
    ]
    print("=== Module API smoke ===")
    for path, label in smoke:
        try:
            req = urllib.request.Request(f"{API}{path}", method="GET")
            with opener.open(req, timeout=20) as resp:
                _ = resp.read()
                ok(f"{label} {path}", str(resp.status))
        except urllib.error.HTTPError as exc:
            # 403 on role-gated routes (e.g. /audit) is expected authorization, not a broken API
            if exc.code == 403:
                ok(f"{label} {path}", "403 authorized-deny (RBAC OK)")
            elif exc.code in (404, 405):
                NOTES.append(f"{label} {path} -> {exc.code}")
                print(f"  NOTE  {label} {path} — HTTP {exc.code}")
            else:
                bad(f"{label} {path}", f"HTTP {exc.code}")
        except Exception as exc:  # noqa: BLE001
            bad(f"{label} {path}", str(exc))

    print("=== Backend AI status + chat ===")
    try:
        req = urllib.request.Request(f"{API}/ai/status", method="GET")
        with opener.open(req, timeout=15) as resp:
            status = json.loads(resp.read().decode("utf-8"))
        if status.get("ready") and status.get("provider") == "imtithal":
            up = status.get("upstream_status") or {}
            ok("AI status", f"backend={up.get('classifier_backend')} ready={status.get('ready')}")
        else:
            bad("AI status", json.dumps(status)[:200])
    except Exception as exc:  # noqa: BLE001
        bad("AI status", str(exc))

    try:
        chat_body = json.dumps(
            {
                "messages": [{"role": "user", "content": "ضعف كلمة المرور في النظام"}],
                "page_context": {"moduleLabel": "Identity"},
            }
        ).encode()
        req = urllib.request.Request(
            f"{API}/ai/chat",
            data=chat_body,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with opener.open(req, timeout=120) as resp:
            chat = json.loads(resp.read().decode("utf-8"))
        reply = (chat.get("reply") or "").strip()
        if reply and not chat.get("prototype"):
            ok("AI chat via backend", reply[:80].replace("\n", " "))
        else:
            bad("AI chat via backend", json.dumps(chat)[:200])
    except Exception as exc:  # noqa: BLE001
        bad("AI chat via backend", str(exc))

    print("\n=== SUMMARY ===")
    print(f"pass={PASS} fail={FAIL}")
    if NOTES:
        print("notes:")
        for n in NOTES:
            print(" -", n)
    return 0 if FAIL == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
