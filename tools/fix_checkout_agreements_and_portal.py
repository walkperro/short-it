from pathlib import Path
import re

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

# 1) Force portal return_url to include ?sync=1
s, n1 = re.subn(r'return_url:\s*`[^`]*`', 'return_url: `${siteUrl}/account?sync=1`', s)

# 2) Remove the profile-based agreements fields selection + checks
# - remove "agreements_version,agreements_accepted_at" from profiles select
s = re.sub(r'(select\(\s*`?[^`"]*)(agreements_version,agreements_accepted_at,?)([^`"]*`?\s*\))',
           r'\1\3', s, flags=re.M)

# also handles the string-literal select you have
s = re.sub(r'("email,stripe_customer_id,)\s*agreements_version,agreements_accepted_at,?\s*(")',
           r'\1\2', s)

# 3) Remove the entire block starting at:
# "const acceptedAt = ..." through the closing "}" of that check
s = re.sub(
    r'\n\s*//\s*✅ Require agreements acceptance before starting Stripe Checkout[\s\S]*?\n\s*}\s*\n',
    "\n",
    s,
    flags=re.M
)

# 4) Remove the stray label if present
s = s.replace("_attach_ok:", "")

# 5) Fix the missing brace after if (!user) return ...
# We'll ensure we have:
# if (!user) { return ...; }
# followed by agreement checks OUTSIDE that block.
# If the agreement check is currently inside, this will usually show as:
# if (!user) { return ...; // ✅ Require agreement acceptance ...
# We'll insert a closing brace right after the return block if needed.

# Pattern: if (!user) { return NextResponse.json(...);  (and no closing brace before agreement lookup)
pat = re.compile(r'(if\s*\(\s*!user\s*\)\s*\{\s*return\s+NextResponse\.json\([\s\S]*?\);\s*)(\n\s*//\s*✅ Require agreement acceptance before purchase)', re.M)
m = pat.search(s)
if m:
    s = pat.sub(r'\1\n  }\n\2', s)

# Safety: ensure we still have the active_agreement + agreement_acceptances check
if ".from(\"active_agreement\")" not in s or ".from(\"agreement_acceptances\")" not in s:
    raise SystemExit("[ERR] active_agreement / agreement_acceptances check missing after patch; refusing.")

p.write_text(s, encoding="utf-8")
print(f"[OK] fixed {p} (portal return_url edits: {n1})")
