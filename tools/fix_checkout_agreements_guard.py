from pathlib import Path
import re

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

# 1) Ensure AGREEMENTS_VERSION exists near top (ok if already there)
if "const AGREEMENTS_VERSION" not in s:
    # Insert after PRICE_BY_TIER block end
    m = re.search(r"const PRICE_BY_TIER[\s\S]*?;\s*", s)
    if not m:
        raise SystemExit("[ERR] Could not find PRICE_BY_TIER to insert AGREEMENTS_VERSION after.")
    insert_at = m.end()
    s = s[:insert_at] + '\nconst AGREEMENTS_VERSION = process.env.NEXT_PUBLIC_AGREEMENTS_VERSION || "2026-01-18";\n' + s[insert_at:]

# 2) Remove any previously inserted agreements guard block (comment + acceptedAt.. + return)
s = re.sub(
    r"\n\s*// ✅ Require agreements acceptance before starting Stripe Checkout[\s\S]*?\n\s*}\s*\n",
    "\n",
    s,
    count=1
)

# 3) Ensure profile select includes agreements fields
s = re.sub(
    r'\.select\("email,\s*stripe_customer_id"\)',
    '.select("email,stripe_customer_id,agreements_version,agreements_accepted_at")',
    s
)

# 4) Insert guard in the correct place: right AFTER the profile lookup error check block
# Find:
# if (error) { return ... }
# then insert guard after that closing brace.
m = re.search(r"if\s*\(\s*error\s*\)\s*\{\s*return\s+NextResponse\.json\([\s\S]*?\);\s*\}\s*", s)
if not m:
    raise SystemExit("[ERR] Could not find the profile lookup error block to anchor insertion.")

guard = """
  // ✅ Require agreements acceptance before starting Stripe Checkout
  const acceptedAt = (profile as any)?.agreements_accepted_at ?? null;
  const acceptedVer = (profile as any)?.agreements_version ?? null;
 _attach_ok:
  if (!acceptedAt || acceptedVer !== AGREEMENTS_VERSION) {
    return NextResponse.json(
      { error: "Please accept the Terms + Disclaimer before purchase." },
      { status: 400 },
    );
  }
"""
# Remove the _attach_ok label if any editor complains (it won't in TS)
guard = guard.replace("\n_attach_ok:\n", "\n")

insert_at = m.end()
s = s[:insert_at] + guard + s[insert_at:]

p.write_text(s, encoding="utf-8")
print("[OK] fixed", p)
