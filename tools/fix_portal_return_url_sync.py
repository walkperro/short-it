from pathlib import Path
import re

p = Path("src/app/api/stripe/portal/route.ts")
s = p.read_text(encoding="utf-8")

# Normalize any repeated sync params like ?sync=1?sync=1 or ?sync=1&sync=1
def normalize(m):
    prefix = m.group(1)
    # Always set canonical
    return f'{prefix}`${{siteUrl}}/account?sync=1`,'

# Match a return_url template literal that starts with `${siteUrl}/account`
pat = re.compile(r'(return_url:\s*)`?\$\{siteUrl\}/account[^`]*`?,')
s2, n = pat.subn(normalize, s)

if n == 0:
    raise SystemExit("[ERR] Could not find return_url using siteUrl/account to normalize.")

p.write_text(s2, encoding="utf-8")
print(f"[OK] normalized return_url in {p} (matches: {n})")
