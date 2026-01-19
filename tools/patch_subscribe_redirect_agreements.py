from pathlib import Path
import re

p = Path("src/app/subscribe/page.tsx")
s = p.read_text(encoding="utf-8")

# Find the checkout() catch block and insert agreement redirect handling right after json parse
# We’ll replace this chunk:
# if (!res.ok) throw new Error(...)
# with a version that checks json.code first.
pat = re.compile(r'if\s*\(\s*!res\.ok\s*\)\s*throw\s+new\s+Error\(\s*json\?\.\w+\s*\?\?\s*"Checkout failed"\s*\);\s*', re.M)

if not pat.search(s):
    # fallback: match any "if (!res.ok) throw new Error(...);"
    pat = re.compile(r'if\s*\(\s*!res\.ok\s*\)\s*throw\s+new\s+Error\([\s\S]*?\);\s*', re.M)

repl = (
    'if (!res.ok) {\n'
    '        // Agreement gate: send user to accept page, then bring them back\n'
    '        if (json?.code === "AGREEMENT_REQUIRED") {\n'
    '          const next = `/subscribe`;\n'
    '          window.location.href = `/agreements?next=${encodeURIComponent(next)}&tier=${encodeURIComponent(tier)}`;\n'
    '          return;\n'
    '        }\n'
    '        throw new Error(json?.error ?? "Checkout failed");\n'
    '      }\n'
)

s2, n = pat.subn(repl, s, count=1)
if n != 1:
    raise SystemExit("[ERR] Could not patch checkout() error handling in subscribe page")

p.write_text(s2, encoding="utf-8")
print(f"[OK] patched {p}")
