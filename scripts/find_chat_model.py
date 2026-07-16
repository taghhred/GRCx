from pathlib import Path
import zipfile

z = Path.home() / "Downloads" / "Imtithal_AItest-20260716T135353Z-1-004.zip"
print("zip", z.exists(), z.stat().st_size if z.exists() else None)
if z.exists():
    with zipfile.ZipFile(z) as zf:
        for n in sorted(zf.namelist()):
            info = zf.getinfo(n)
            if (
                info.file_size > 500_000
                or n.endswith("/")
                or any(k in n.lower() for k in ("model", "chat", "llm", "safetensor", "gguf", "bin"))
            ):
                print(f"{info.file_size/1e6:8.1f}MB  {n}")

desk = Path(r"c:/Users/hp/OneDrive/سطح المكتب")
print("\nDESKTOP")
for p in sorted(desk.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True)[:40]:
    print(("DIR " if p.is_dir() else f"{p.stat().st_size:10d} "), p.name)

gr = desk / "GRCx"
print("\nGRCx")
for p in sorted(gr.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
    print(("DIR " if p.is_dir() else f"{p.stat().st_size:10d} "), p.name)

# HF cache
for cache in [
    Path.home() / ".cache" / "huggingface" / "hub",
    Path(r"c:/Users/hp/OneDrive/سطح المكتب/GRCx/ai-service") / ".cache",
]:
    if cache.exists():
        print("\nCACHE", cache)
        for p in list(cache.iterdir())[:30]:
            print(p.name)
