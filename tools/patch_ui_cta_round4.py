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

# --- 1) CTA: subtitle smaller + remove arrow circle ---
cta = ROOT / "src/components/ReadFullConvictionCta.tsx"
if not cta.exists():
    die(f"missing {cta}")

s = cta.read_text(encoding="utf-8")

# Make subtitle smaller + single-line truncation (fits)
# (we go to 9px and slightly tighter tracking)
s = re.sub(
    r'className="mt-2 text-\[10px\] tracking-\[0\.35em\] text-white/40 truncate"',
    'className="mt-2 text-[9px] tracking-[0.28em] text-white/40 truncate"',
    s
)

# Ensure title is single-line truncation too (just in case)
s = re.sub(
    r'className="text-base font-semibold tracking-tight text-white(?! truncate)"',
    'className="text-base font-semibold tracking-tight text-white truncate"',
    s
)

# Remove the arrow circle wrapper styles -> make it plain arrow
# Replace the whole arrow <div ...>...</div> with a simple arrow span
s = re.sub(
    r'<div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-white/70 transition group-hover:bg-black/40 group-hover:text-white/85">\s*<span className="text-lg leading-none">→</span>\s*</div>',
    '<span className="text-lg leading-none text-white/70 transition group-hover:text-white/85">→</span>',
    s,
    flags=re.S
)

write_if_changed(cta, s)

# --- 2) conviction/[slug] teaser: force-add Back to Convictions link at bottom ---
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
    idx = c.rfind("</main>")
    if idx == -1:
        die("could not find </main> in src/app/conviction/[slug]/page.tsx")
    c = c[:idx] + back_block + c[idx:]
    write_if_changed(conv_teaser, c)
else:
    print("[OK] already has Back to Convictions", conv_teaser)

print("[DONE] CTA subtitle fit + arrow circle removed + back link ensured.")
