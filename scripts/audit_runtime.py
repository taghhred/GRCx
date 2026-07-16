"""Full audit runtime harness — live only, no fabrication."""
from __future__ import annotations

import json
import statistics
import time
import urllib.error
import urllib.request
from http.cookiejar import CookieJar

AI = "http://127.0.0.1:8001"
API = "http://127.0.0.1:8002/api/v1"

AR = [
    "كلمة المرور ضعيفة وسهلة التخمين",
    "لا يوجد تحقق متعدد العوامل MFA للحسابات الإدارية",
    "حساب مستخدم غير مستخدم منذ أكثر من سنة",
    "صلاحيات زائدة ممنوحة لموظف عادي",
    "سجلات التدقيق غير مفعلة على النظام",
    "فصل المهام غير مطبق بين المطور والإنتاج",
    "سلوك مشبوه في تسجيل الدخول من موقع غير معتاد",
    "إدارة الحسابات ذات الامتيازات PAM غير موجودة",
    "كلمة سر افتراضية لم يتم تغييرها",
    "حساب مشترك يستخدمه أكثر من شخص",
    "تعطيل المصادقة الثنائية للمستخدمين",
    "وصول غير مصرح به لملفات حساسة",
    "عدم مراجعة صلاحيات الموظفين دوريا",
    "حساب إداري بدون مراقبة جلسة",
    "تسريب بيانات اعتماد في البريد",
    "عدم تسجيل محاولات الدخول الفاشلة",
    "منح صلاحية حذف لجميع المستخدمين",
    "حساب مقاول ما زال فعالا بعد انتهاء العقد",
    "استخدام كلمة مرور قصيرة أقل من 8 أحرف",
    "عدم وجود سياسة كلمات المرور",
]

EN = [
    "Weak password that is easy to guess",
    "No multi-factor authentication MFA enabled",
    "Stale user account unused for over a year",
    "Excessive privileges granted to a regular employee",
    "Audit logging is disabled on the system",
    "Segregation of duties not enforced between roles",
    "Suspicious login behavior from unusual location",
    "No privileged access management PAM in place",
    "Default password was never changed",
    "Shared account used by multiple people",
]


def post_json(url: str, payload: dict, opener=None, timeout=90):
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/json"}, method="POST"
    )
    open_fn = opener.open if opener else urllib.request.urlopen
    with open_fn(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode())


def get_json(url: str, opener=None, timeout=30):
    req = urllib.request.Request(url, method="GET")
    open_fn = opener.open if opener else urllib.request.urlopen
    with open_fn(req, timeout=timeout) as resp:
        return resp.status, json.loads(resp.read().decode())


def main():
    report = {"ai_inference": [], "chat": {}, "auth": {}, "apis": {}, "process": {}}

    # Prove process uses torch/transformers via health + analyze engine
    _, health = get_json(f"{AI}/health")
    report["health"] = {
        "model_loaded": health.get("model_loaded"),
        "classifier": health.get("classifier"),
        "checkpoint": health.get("checkpoint"),
        "model_path": health.get("model_path"),
        "retriever": health.get("retriever"),
    }

    print("=== ARABIC INFERENCE (20) ===")
    ar_lat = []
    for i, text in enumerate(AR, 1):
        t0 = time.perf_counter()
        try:
            st, body = post_json(
                f"{AI}/analyze",
                {"text": text, "use_llm": False, "top_articles": 1, "lang": "ar"},
            )
            ms = (time.perf_counter() - t0) * 1000
            ar_lat.append(ms)
            eng = body.get("engine") or {}
            clf = eng.get("classifier") if isinstance(eng, dict) else None
            cat = (body.get("classification") or {}).get("category")
            conf = (body.get("classification") or {}).get("confidence")
            row = {
                "i": i,
                "ok": clf == "arabert" and bool(cat),
                "engine": clf,
                "category": cat,
                "confidence": conf,
                "ms": round(ms, 1),
            }
            report["ai_inference"].append({"lang": "ar", **row})
            print(f"  AR{i:02d} eng={clf} cat={cat} conf={conf} ms={ms:.0f}")
        except Exception as e:
            report["ai_inference"].append({"lang": "ar", "i": i, "ok": False, "error": str(e)})
            print(f"  AR{i:02d} FAIL {e}")

    print("=== ENGLISH INFERENCE (10) ===")
    en_lat = []
    for i, text in enumerate(EN, 1):
        t0 = time.perf_counter()
        try:
            st, body = post_json(
                f"{AI}/analyze",
                {"text": text, "use_llm": False, "top_articles": 1, "lang": "en"},
            )
            ms = (time.perf_counter() - t0) * 1000
            en_lat.append(ms)
            eng = body.get("engine") or {}
            clf = eng.get("classifier") if isinstance(eng, dict) else None
            cat = (body.get("classification") or {}).get("category")
            conf = (body.get("classification") or {}).get("confidence")
            row = {
                "i": i,
                "ok": clf == "arabert" and bool(cat),
                "engine": clf,
                "category": cat,
                "confidence": conf,
                "ms": round(ms, 1),
            }
            report["ai_inference"].append({"lang": "en", **row})
            print(f"  EN{i:02d} eng={clf} cat={cat} conf={conf} ms={ms:.0f}")
        except Exception as e:
            report["ai_inference"].append({"lang": "en", "i": i, "ok": False, "error": str(e)})
            print(f"  EN{i:02d} FAIL {e}")

    if ar_lat:
        report["latency_ar"] = {
            "n": len(ar_lat),
            "mean_ms": round(statistics.mean(ar_lat), 1),
            "p50_ms": round(statistics.median(ar_lat), 1),
            "max_ms": round(max(ar_lat), 1),
        }
    if en_lat:
        report["latency_en"] = {
            "n": len(en_lat),
            "mean_ms": round(statistics.mean(en_lat), 1),
            "p50_ms": round(statistics.median(en_lat), 1),
            "max_ms": round(max(en_lat), 1),
        }

    # Auth + chatbot multi-turn
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    print("=== AUTH + CHAT ===")
    try:
        st, tokens = post_json(
            f"{API}/auth/login",
            {"email": "test@grcx.local", "password": "123456"},
            opener=opener,
        )
        report["auth"]["login"] = True
        print("  login OK")
    except Exception as e:
        report["auth"]["login"] = False
        report["auth"]["error"] = str(e)
        print("  login FAIL", e)
        print(json.dumps(report, ensure_ascii=False, indent=2)[:3000])
        return

    st, me = get_json(f"{API}/auth/me", opener=opener)
    report["auth"]["me"] = me.get("email")
    print("  me", me.get("email"), me.get("roles"))

    st, aist = get_json(f"{API}/ai/status", opener=opener)
    report["auth"]["ai_status"] = aist
    print("  ai_status", aist.get("ready"), (aist.get("upstream_status") or {}).get("classifier_backend"))

    msgs = []
    for content in [
        "ضعف كلمة المرور في النظام",
        "What about MFA missing?",
        "هل الحسابات القديمة مشكلة؟",
    ]:
        msgs.append({"role": "user", "content": content})
        t0 = time.perf_counter()
        try:
            st, chat = post_json(
                f"{API}/ai/chat",
                {"messages": list(msgs), "page_context": {"moduleLabel": "Identity"}},
                opener=opener,
                timeout=120,
            )
            ms = (time.perf_counter() - t0) * 1000
            reply = (chat.get("reply") or "")[:120]
            ok = bool(chat.get("reply")) and not chat.get("prototype")
            msgs.append({"role": "assistant", "content": chat.get("reply") or ""})
            report["chat"].setdefault("turns", []).append(
                {"ok": ok, "prototype": chat.get("prototype"), "provider": chat.get("provider"), "ms": round(ms, 1)}
            )
            print(f"  chat turn ok={ok} provider={chat.get('provider')} prototype={chat.get('prototype')} ms={ms:.0f}")
            print(f"    reply: {reply.replace(chr(10),' ')[:100]}")
        except Exception as e:
            report["chat"].setdefault("turns", []).append({"ok": False, "error": str(e)})
            print("  chat FAIL", e)

    # API smoke
    for path in [
        "/risks",
        "/risks/stats",
        "/governance/policies",
        "/governance/kpis",
        "/cases",
        "/notifications",
        "/ready",
    ]:
        try:
            st, _ = get_json(f"{API}{path}", opener=opener)
            report["apis"][path] = st
            print(f"  API {path} {st}")
        except urllib.error.HTTPError as e:
            report["apis"][path] = e.code
            print(f"  API {path} {e.code}")
        except Exception as e:
            report["apis"][path] = str(e)
            print(f"  API {path} ERR {e}")

    # Prove torch in AI process via /health already; try process scan if Windows
    try:
        import subprocess

        out = subprocess.check_output(
            ["powershell", "-NoProfile", "-Command",
             "(Get-NetTCPConnection -LocalPort 8001 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess"],
            text=True,
            timeout=15,
        ).strip()
        pid = out.splitlines()[-1].strip() if out else ""
        report["process"]["ai_pid"] = pid
        if pid.isdigit():
            mods = subprocess.check_output(
                ["powershell", "-NoProfile", "-Command",
                 f"Get-Process -Id {pid} -ErrorAction SilentlyContinue | ForEach-Object {{ $_.Modules | Where-Object {{ $_.ModuleName -match 'torch|tokenizers|c10' }} | Select-Object -ExpandProperty ModuleName -Unique }}"],
                text=True,
                timeout=30,
            )
            report["process"]["modules"] = [m.strip() for m in mods.splitlines() if m.strip()]
            print("  AI PID modules sample:", report["process"]["modules"][:8])
    except Exception as e:
        report["process"]["error"] = str(e)

    ok_inf = sum(1 for r in report["ai_inference"] if r.get("ok"))
    print("\n=== SUMMARY ===")
    print(f"inference_ok={ok_inf}/{len(AR)+len(EN)}")
    print(f"latency_ar={report.get('latency_ar')}")
    print(f"latency_en={report.get('latency_en')}")
    print(f"health={report['health']}")
    out_path = "logs/audit_runtime.json"
    try:
        open(out_path, "w", encoding="utf-8").write(json.dumps(report, ensure_ascii=False, indent=2))
        print("wrote", out_path)
    except Exception:
        pass


if __name__ == "__main__":
    main()
