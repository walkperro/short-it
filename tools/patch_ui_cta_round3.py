from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def die(msg: str):
    raise SystemExit("[ERR] " + msg)

def write_if_changed(p: Path, s: str):
    old = p.read_text(encoding="utf-8")
    if old == s:
        print("[OK] no change", p)
        return
    p.write_text(s, encoding="utf-8")
    print("[OK] patched", p)

# 1) CTA text smaller (fits), keep 1-line title + 1-line subtitle
cta_path = ROOT / "src/components/ReadFullConvictionCta.tsx"
if not cta_path.exists():
    die(f"missing {cta_path}")

s = cta_path.read_text(encoding="utf-8")

# Replace title/subtitle classes with smaller ones
s = re.sub(
    r'className="text-lg font-semibold tracking-tight text-white truncate"',
    'className="text-base font-semibold tracking-tight text-white truncate"',
    s
)
s = re.sub(
    r'className="mt-2 text-xs tracking-\[0\.35em\] text-white/40 truncate"',
    'className="mt-2 text-[10px] tracking-[0.35em] text-white/40 truncate"',
    s
)

# Slightly reduce padding to match older look
s = s.replace('"px-6 py-5 backdrop-blur-xl transition"', '"px-5 py-4 backdrop-blur-xl transition"')

# Make arrow container a bit smaller
s = s.replace("flex h-10 w-10", "flex h-9 w-9")

write_if_changed(cta_path, s)

# 2) conviction/[slug] teaser: ensure Back to Convictions link exists before </main>
conv_teaser = ROOT / "src/app/conviction/[slug]/page.tsx"
if not conv_teaser.exists():
    die(f"missing {conv_teaser}")

c = conv_teaser.read_text(encoding="utf-8")

if "Back to Convictions" not in c:
    back_block = """
      <div className="mt-6">
        <Link
          href="/conviction"
          className="text-sm text-white/70 underline underline-offset-4 hover:text-white"
        >
          Back to Convictions
        </Link>
      </div>
"""
    # insert right before the LAST </main>
    idx = c.rfind("</main>")
    if idx == -1:
        die("could not find </main> in conviction/[slug]/page.tsx")
    c = c[:idx] + back_block + c[idx:]
    write_if_changed(conv_teaser, c)
else:
    print("[OK] already has Back to Convictions", conv_teaser)

# 3) conviction/[slug]/full: remove WRITE-UP label
conv_full = ROOT / "src/app/conviction/[slug]/full/page.tsx"
if not conv_full.exists():
    die(f"missing {conv_full}")

f = conv_full.read_text(encoding="utf-8")

# Remove the "WRITE-UP" header block line
f2 = re.sub(
    r'\s*<div className="text-xs tracking-widest text-white/50">WRITE-UP</div>\s*\n',
    "\n",
    f
)

write_if_changed(conv_full, f2)

print("[DONE] UI round3 patches applied.")
