from pathlib import Path
import re

p = Path("src/app/account/page.tsx")
s = p.read_text(encoding="utf-8")

# Add import
if 'SyncBillingOnReturn' not in s:
    s = s.replace(
        'import ManageBillingButton from "@/components/billing/ManageBillingButton";',
        'import ManageBillingButton from "@/components/billing/ManageBillingButton";\nimport SyncBillingOnReturn from "@/components/billing/SyncBillingOnReturn";'
    )

# Change function signature to accept searchParams
sig_pat = re.compile(r"export default async function AccountPage\(\)\s*\{")
if not sig_pat.search(s):
    raise SystemExit("[ERR] Could not find AccountPage() signature")

s = sig_pat.sub(
    'export default async function AccountPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {',
    s,
    count=1
)

# Insert enabled flag near top (after user check ideally)
if "const shouldSync =" not in s:
    # put it after we establish user, before profile query is fine
    marker = "if (!user) {"
    idx = s.find(marker)
    if idx == -1:
        raise SystemExit("[ERR] Could not find user guard in account page")
    insert = 'const shouldSync = searchParams?.sync === "1";\n'
    s = s[:idx] + insert + s[idx:]

# Render <SyncBillingOnReturn /> right under <main ...>
if "<SyncBillingOnReturn" not in s:
    s = s.replace(
        '<main className="mx-auto max-w-4xl px-6 py-10 text-white">',
        '<main className="mx-auto max-w-4xl px-6 py-10 text-white">\n      <SyncBillingOnReturn enabled={Boolean(shouldSync)} />'
    )

p.write_text(s, encoding="utf-8")
print("[OK] patched", p)
