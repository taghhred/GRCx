# -*- coding: utf-8 -*-
import json
import re
import sys
import urllib.request

sys.path.insert(0, r"c:\Users\hp\OneDrive\سطح المكتب\GRCx\ai-service\current")
from imtithal.advisor import detect_reply_lang

assert detect_reply_lang("What is IAM?") == "en"
assert detect_reply_lang("ما هو IAM؟") == "ar"
print("detect OK")


def post(msg: str) -> dict:
    data = json.dumps(
        {"message": msg, "history": [], "module": "Dashboard", "lang": "auto"}
    ).encode()
    req = urllib.request.Request(
        "http://127.0.0.1:8001/advisor/chat",
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode())


r1 = post("What is IAM?")
print("EN model:", r1.get("model"))
print("EN preview:", r1["reply"][:300].replace("\n", " | "))
assert "إجابة عن" not in r1["reply"]
assert "مقاطع ذات صلة" not in r1["reply"]
# Framing or body should be English-led
assert "Answer for" in r1["reply"] or re.search(r"[A-Za-z]{4}", r1["reply"])

r2 = post("ما هو IAM؟")
print("AR model:", r2.get("model"))
print("AR preview:", r2["reply"][:300].replace("\n", " | "))
assert re.search(r"[\u0600-\u06FF]", r2["reply"]), "Arabic answer expected"
print("PASS")
