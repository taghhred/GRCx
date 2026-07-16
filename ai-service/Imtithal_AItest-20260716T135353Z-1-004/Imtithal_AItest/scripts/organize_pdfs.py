#!/usr/bin/env python3
"""
تنزيل ثم ترتيب PDFs: أسماء موحّدة + إزالة النسخ المكررة (نفس المحتوى).

  python scripts/organize_pdfs.py
  python scripts/organize_pdfs.py --skip-download
"""
from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PDF_ROOT = ROOT / "pdfs"

# الاسم القياسي ← قائمة الأسماء القديمة/البديلة (تُحذف بعد نسخ للاسم القياسي)
CANONICAL_ALIASES: dict[str, dict[str, list[str]]] = {
    "01_regulations": {
        "SAMA_CSF.pdf": ["SAMA-Cyber-Security-Framework.pdf"],
        "SAMA_BCM_Framework.pdf": ["SAMA_EN_3709_VER1.pdf"],
        "NCA_ECC_2024_EN.pdf": ["ECC--2024-EN.pdf", "NCA_ECC_2024.pdf"],
        "NCA_ECC_2018.pdf": ["ecc-en.pdf"],
        "NCA_CSCC.pdf": ["Critical-Systems-Cybersecurity-Controls.pdf"],
        "NCA_OTCC.pdf": ["otcc_en.pdf"],
        "NCA_OTCC_Mapping.pdf": [
            "Operational-Technology-Cybersecurity-Controls-Methodogy-and-Mapping-Annex.pdf",
        ],
        "NCA_CCC.pdf": ["ccc-en.pdf"],
        "NCA_CCC_Cloud.pdf": ["CCC-2-2024-EN-.pdf"],
    },
    "02_audit_reports": {
        "Aujas_NCA_Compliance.pdf": ["NCA-Compliance-Whitepaper-1.pdf"],
        "Darktrace_NCA_ECC.pdf": [
            "671c1b93a6351e198d1137b2_NCA and ECC Compliance v2[1].pdf",
        ],
    },
    "03_reference": {
        "NCA_ECC_Implementation_Guide.pdf": [
            "Guide-to-Essential-Cybersecurity-Controls-(ECC)-Implementation.pdf",
        ],
        "SDAIA_PDPL_Guide.pdf": [
            "ENG-Guide+to+the+saudi+PDP+law+for+controllersprocessors.pdf",
        ],
        "SDAIA_PDPL_Handbook.pdf": [
            "Guide+to+the+saudi+PDP+law+HANDBOOK__ِEN.pdf",
        ],
        "PwC_PDPL_Guide.pdf": ["ksa-personal-data-protection-law-series-part-1.pdf"],
        "Oracle_SAMA_Advisory.pdf": ["oci-sama-csfa.pdf"],
        "NIST_CSF.pdf": ["NIST.CSWP.29.pdf"],
        "NIST_SP_800_53_Access.pdf": ["NIST.SP.800-53r5.pdf"],
        "NIST_SP_800_61_Incident.pdf": ["NIST.SP.800-61r2.pdf"],
        "NIST_SP_800_63b_Password.pdf": ["NIST.SP.800-63b.pdf"],
        "NIST_SP_800_181_Workforce.pdf": ["NIST.SP.800-181r1.pdf"],
        "NIST_SP_800_34_Contingency.pdf": [
            "nistspecialpublication800-34r1.pdf",
        ],
    },
    "04_policies": {
        "CIS_Controls_v8.pdf": ["CIS_Controls_Guide_v8.1.2_0325_v2.pdf"],
    },
}

# ملفات في مجلد خاطئ
WRONG_FOLDER: list[tuple[str, str]] = [
    ("01_regulations/oci-sama-csfa.pdf", "03_reference/Oracle_SAMA_Advisory.pdf"),
]

MIN_BYTES = 50_000


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def run_downloads() -> None:
    scripts = [
        "download_pdfs.py",
        "download_missing_pdfs.py",
        "download_verified_pdfs.py",
    ]
    for name in scripts:
        p = ROOT / "scripts" / name
        if not p.is_file():
            print(f"⚠️ تخطي: {name}")
            continue
        print(f"\n▶ {name}")
        subprocess.run([sys.executable, str(p)], cwd=str(ROOT), check=False)


def ensure_canonical(folder: str, canonical: str, aliases: list[str]) -> None:
    dest_dir = PDF_ROOT / folder
    dest = dest_dir / canonical
    dest_dir.mkdir(parents=True, exist_ok=True)

    sources = [dest_dir / a for a in aliases if (dest_dir / a).is_file()]
    if not dest.is_file() and sources:
        # انسخ من أول بديل
        src = max(sources, key=lambda p: p.stat().st_size)
        shutil.copy2(src, dest)
        print(f"   📋 نسخ → {folder}/{canonical} (من {src.name})")

    if not dest.is_file() or dest.stat().st_size < MIN_BYTES:
        return

    dest_h = file_hash(dest)
    for src in sources:
        if src.resolve() == dest.resolve():
            continue
        if not src.is_file():
            continue
        if file_hash(src) == dest_h:
            src.unlink()
            print(f"   🗑️ حذف مكرر: {folder}/{src.name}")
        elif src.name in aliases:
            # اسم قديم مختلف المحتوى — احتفظ إن كان الوحيد
            pass


def remove_wrong_folder() -> None:
    for wrong_rel, canonical_rel in WRONG_FOLDER:
        wrong = PDF_ROOT / wrong_rel.replace("/", os.sep)
        canonical = PDF_ROOT / canonical_rel.replace("/", os.sep)
        if wrong.is_file() and canonical.is_file():
            if file_hash(wrong) == file_hash(canonical):
                wrong.unlink()
                print(f"   🗑️ مجلد خاطئ: {wrong_rel}")
            else:
                wrong.unlink()
                print(f"   🗑️ إزالة من مجلد خاطئ: {wrong_rel}")


def dedupe_exact_in_folder(folder: str) -> None:
    """حذف ملفات بنفس الـ hash (يبقى الاسم الأقصر/القياسي)."""
    d = PDF_ROOT / folder
    if not d.is_dir():
        return
    by_hash: dict[str, list[Path]] = {}
    for p in d.glob("*.pdf"):
        if p.stat().st_size < MIN_BYTES:
            p.unlink()
            print(f"   🗑️ فاسد (صغير): {folder}/{p.name}")
            continue
        by_hash.setdefault(file_hash(p), []).append(p)

    preferred = {v for aliases in CANONICAL_ALIASES.get(folder, {}).values() for v in aliases}
    preferred |= set(CANONICAL_ALIASES.get(folder, {}).keys())

    for _h, paths in by_hash.items():
        if len(paths) < 2:
            continue
        keep = None
        for p in paths:
            if p.name in CANONICAL_ALIASES.get(folder, {}):
                keep = p
                break
        if keep is None:
            paths.sort(key=lambda x: (x.name not in preferred, len(x.name)))
            keep = paths[0]
        for p in paths:
            if p != keep:
                p.unlink()
                print(f"   🗑️ تكرار hash: {folder}/{p.name} (بقي {keep.name})")


def print_summary() -> None:
    print("\n" + "=" * 60)
    print("📁 هيكل PDFs بعد الترتيب")
    print("=" * 60)
    total = 0
    for sub in sorted(PDF_ROOT.iterdir()):
        if not sub.is_dir():
            continue
        pdfs = sorted(sub.glob("*.pdf"))
        sz = sum(p.stat().st_size for p in pdfs) / (1024 * 1024)
        total += len(pdfs)
        print(f"\n📂 {sub.name}/ ({len(pdfs)} ملف، {sz:.1f} MB)")
        for p in pdfs:
            print(f"   • {p.name}")
    print(f"\n📦 الإجمالي: {total} PDF")


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    ap = argparse.ArgumentParser()
    ap.add_argument("--skip-download", action="store_true")
    args = ap.parse_args()

    if not args.skip_download:
        print("📥 المرحلة 1: التحميل")
        run_downloads()

    print("\n📂 المرحلة 2: الترتيب والأسماء القياسية")
    for folder, mapping in CANONICAL_ALIASES.items():
        print(f"\n{folder}/")
        for canonical, aliases in mapping.items():
            ensure_canonical(folder, canonical, aliases)
        dedupe_exact_in_folder(folder)

    remove_wrong_folder()
    print_summary()


if __name__ == "__main__":
    main()
