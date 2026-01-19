from pathlib import Path

p = Path("src/app/api/me/plan/route.ts")
s = p.read_text(encoding="utf-8")

old = '.select("plan,is_admin,stripe_customer_id,stripe_subscription_id,email")'
new = '.select("plan,is_admin,stripe_customer_id,stripe_subscription_id,email,agreements_version,agreements_accepted_at")'

if old not in s and new not in s:
    raise SystemExit("[ERR] Could not find the select() fields in /api/me/plan route")

s = s.replace(old, new)

p.write_text(s, encoding="utf-8")
print("[OK] patched", p)
