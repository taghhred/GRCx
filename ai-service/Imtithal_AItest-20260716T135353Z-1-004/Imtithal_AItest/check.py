#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quick health check for Imtithal local package."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main() -> None:
    print("Imtithal package:", ROOT)
    clf = ROOT / "models" / "classifier"
    weights = (clf / "model.safetensors").exists() or (clf / "pytorch_model.bin").exists()
    print("AraBERT weights present:", weights)
    dash = ROOT / "web" / "imtithal_dashboard.html"
    print("Dashboard HTML:", dash.exists(), dash)
    try:
        from imtithal import storage

        storage.init_db()
        n = storage.count_findings()
        print("Findings DB:", storage.DB_PATH)
        print("Findings record count:", n)
        stats = storage.compute_stats()
        print("Compliance score:", stats["kpis"]["compliance_score"])
        print("Open risks:", stats["kpis"]["open_risks"])
    except Exception as exc:  # noqa: BLE001
        print("Storage check failed:", exc)
        raise SystemExit(1)
    print("OK")


if __name__ == "__main__":
    main()
