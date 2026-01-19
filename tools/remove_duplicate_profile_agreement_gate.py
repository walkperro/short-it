from pathlib import Path
import re

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

# Remove the block that starts at:
# // ✅ Require agreements acceptance before starting Stripe Checkout
# and ends after the return NextResponse.json(... 400/...)
pat = re.compile(
    r"\n\s*// ✅ Require agreements acceptance before starting Stripe Checkout[\s\S]*?\n\s*\}\s*\n",
    re.M,
)

s2, n = pat.subn("\n", s, count=1)
if n != 1:
    print("[WARN] Did not find the duplicate profile agreement gate block. Nothing removed.")
else:
    p.write_text(s2, encoding="utf-8")
    print(f"[OK] removed duplicate profile agreement gate in {p}")
