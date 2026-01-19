from pathlib import Path
import re

p = Path("src/app/api/stripe/portal/route.ts")
s = p.read_text(encoding="utf-8")

# Replace return_url: `${siteUrl}/account` (or with spaces/comma) with sync=1
pat = re.compile(r"(return_url\s*:\s*`[^`]*?/account)([^`]*?`)", re.MULTILINE)

if not pat.search(s):
    raise SystemExit("[ERR] Could not find return_url template string pointing to /account in portal route.")

s2 = pat.sub(r"\1?sync=1\2", s)

p.write_text(s2, encoding="utf-8")
print("[OK] patched", p)
