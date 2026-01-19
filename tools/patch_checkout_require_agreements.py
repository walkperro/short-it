from pathlib import Path
import re

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

# Ensure we select agreements fields from profile
s = re.sub(
    r'\.select\("email,\s*stripe_customer_id"\)',
    '.select("email,stripe_customer_id,agreements_version,agreements_accepted_at")',
    s
)

# Insert guard after profile is loaded
if "AGREEMENTS_VERSION" not in s:
    # Add const near top (after PRICE_BY_TIER ideally)
    insert_at = s.find("const PRICE_BY_TIER")
    if insert_at == -1:
        raise SystemExit("[ERR] Could not find PRICE_BY_TIER block")
    # Find end of that block line ; insert after it
    end = s.find("};", insert_at)
    if end == -1:
        raise SystemExit("[ERR] Could not find end of PRICE_BY_TIER block")
    end += 2
    s = s[:end] + '\n\nconst AGREEMENTS_VERSION = process.env.NEXT_PUBLIC_AGREEMENTS_VERSION || "2026-01-18";\n' + s[end:]

guard = """
  // ✅ Require agreements acceptance before starting Stripe Checkout
  const acceptedAt = (profile as any)?.agreements_accepted_at ?? null;
  const acceptedVer = (profile as any)?.agreements_version ?? null;
  if (!acceptedAt || acceptedVer !== AGREEMENTS_VERSION) {
    return NextResponse.json({ error: "Please accept the Terms + Disclaimer before purchase." }, { status: 400 });
  }
"""

if "Require agreements acceptance" not in s:
    # Place it right after profile lookup error check
    marker = "if (error) {"
    m = s.find(marker)
    if m == -1:
        raise SystemExit("[ERR] Could not locate profile lookup error block to insert agreements guard")

    # Insert after that block closes (first occurrence of "}" after it) + newline
    close_idx = s.find("}", m)
    if close_idx == -1:
        raise SystemExit("[ERR] Could not find end of profile lookup error block")
    close_idx = s.find("\n", close_idx)  # end of line
    if close_idx == -1:
        close_idx = close_idx
    s = s[:close_idx+1] + guard + s[close_idx+1:]

p.write_text(s, encoding="utf-8")
print("[OK] patched", p)
