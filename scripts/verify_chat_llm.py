# -*- coding: utf-8 -*-
"""Live chat pipeline verification."""
from __future__ import annotations

import json
import urllib.request

BASE = "http://127.0.0.1:8001"
QUESTIONS = [
    "Explain IAM.",
    "Explain NCA ECC password policy.",
    "Difference between IAM and PAM.",
    "Explain SOAR.",
    "Explain why GRCx integrates SOAR.",
]


def post(path: str, payload: dict) -> dict:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        BASE + path,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))


def get(path: str) -> dict:
    with urllib.request.urlopen(BASE + path, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def main() -> None:
    health = get("/health")
    print("=== /health ===")
    print(
        json.dumps(
            {
                "inference_pipeline": health.get("inference_pipeline"),
                "chat_engine": health.get("chat_engine"),
                "classifier": health.get("classifier"),
                "checkpoint": health.get("checkpoint"),
                "model_path": health.get("model_path"),
                "classifier_role": health.get("classifier_role"),
                "llm": health.get("llm"),
            },
            indent=2,
            ensure_ascii=False,
        )
    )
    print()
    replies: list[str] = []
    for q in QUESTIONS:
        out = post(
            "/api/v1/chat",
            {
                "messages": [{"role": "user", "content": q}],
                "lang": "en",
                "page_context": {"moduleLabel": "GRCx Assistant"},
            },
        )
        meta = out.get("meta") or {}
        reply = out.get("reply") or ""
        replies.append(reply)
        print("=" * 72)
        print("Q:", q)
        print("answer_model:", meta.get("answer_model"))
        print("answer_checkpoint:", meta.get("answer_checkpoint"))
        print("answer_tokenizer:", meta.get("answer_tokenizer"))
        print("classifier_model:", meta.get("classifier_model"))
        print("classifier_category:", meta.get("classifier_category"))
        print("classifier_checkpoint:", meta.get("classifier_checkpoint"))
        print("arabert_replaced_answer:", meta.get("arabert_replaced_answer"))
        print("dialogue_topic:", meta.get("dialogue_topic"))
        print("reply_preview:", reply[:320].replace("\n", " | "))
        print()

    unique = len(set(replies))
    print(f"Unique replies: {unique}/{len(QUESTIONS)}")
    if unique < len(QUESTIONS):
        raise SystemExit("FAIL: answers not distinct enough")
    if any("Violation Analysis Report" in r for r in replies):
        raise SystemExit("FAIL: chat returned analyze template")
    print("PASS: distinct conversational answers; AraBERT did not replace chat replies")


if __name__ == "__main__":
    main()
