"""One-shot production cleanup: junction + duplicate weight removal."""
from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

root = Path(__file__).resolve().parents[1]
ai = root / "ai-service"
prod_rel = Path("Imtithal_AItest-20260716T135353Z-1-004") / "Imtithal_AItest"
prod = ai / prod_rel
classifier = prod / "models" / "classifier"

if not (classifier / "model.safetensors").exists():
    raise SystemExit(f"production classifier missing: {classifier}")

os.chdir(ai)
current = Path("current")
if current.exists() or current.is_symlink():
    subprocess.run(["cmd", "/c", "rmdir", "current"], check=False)

rc = subprocess.run(
    ["cmd", "/c", f"mklink /J current {prod_rel}"],
    capture_output=True,
    text=True,
)
print("junction:", rc.returncode, (rc.stdout or "").strip(), (rc.stderr or "").strip())
print("current ok:", current.exists(), (current / "server.py").exists())

os.chdir(root)

for rel in ("versions", "checkpoints"):
    p = prod / rel
    if p.exists():
        print("removing", p)
        shutil.rmtree(p, ignore_errors=True)
        print("  gone?", not p.exists())

for rel in ("models/fallback", "models/saved"):
    p = prod / Path(rel)
    if p.exists():
        print("removing", p)
        shutil.rmtree(p, ignore_errors=True)

old = ai / "Imtithal_AI_v2.1"
if old.exists():
    print("removing obsolete", old)
    shutil.rmtree(old, ignore_errors=True)
    print("  gone?", not old.exists())
    if old.exists():
        print("NOTE: Imtithal_AI_v2.1 is locked — close shells using that cwd, then re-run.")

for d in (root / "logs", ai / "logs", root / "backend" / "logs", prod / "logs"):
    d.mkdir(parents=True, exist_ok=True)

weights = list(ai.rglob("model.safetensors"))
unique = {w.resolve() for w in weights}
print("unique weight files:", len(unique))
for w in unique:
    print(" ", w)
print("ai children:", [x.name for x in ai.iterdir()])
