from pathlib import Path

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

needle = '.eq("user_id", user.id)'
if needle not in s:
    raise SystemExit("[ERR] Did not find exact pattern: " + needle)

s2 = s.replace(needle, '.eq("user_id", user!.id)')

p.write_text(s2, encoding="utf-8")
print("[OK] patched", p)
