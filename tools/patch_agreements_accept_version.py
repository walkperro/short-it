from pathlib import Path
import re

p = Path("src/app/api/agreements/accept/route.ts")
s = p.read_text(encoding="utf-8")

# Ensure we don't keep a hard-coded AGREEMENTS_VERSION as the only source of truth.
# We'll still keep env fallback, but prefer requested/active version.

# 1) Add fetch of req json at top of POST and resolve version using:
#    body.version ?? active_agreement.version ?? env fallback
if "const { version" not in s and "active_agreement" not in s:
    # Insert body parse after function POST line
    s = re.sub(
        r"export async function POST\(req: NextRequest\) \{\n",
        "export async function POST(req: NextRequest) {\n"
        "  const body = await req.json().catch(() => ({} as any));\n"
        "  const requestedVersion = (body?.version as string | undefined) ?? undefined;\n",
        s,
        count=1
    )

# 2) Replace old AGREEMENTS_VERSION usage logic block with resolving version
# Find the AGREEMENTS_VERSION const and keep it as fallback (rename to FALLBACK_VERSION)
s = re.sub(
    r"const AGREEMENTS_VERSION\s*=\s*process\.env\.NEXT_PUBLIC_AGREEMENTS_VERSION\s*\|\|\s*\"[^\"]+\";\n",
    "const FALLBACK_VERSION = process.env.NEXT_PUBLIC_AGREEMENTS_VERSION || \"2026-01-18\";\n",
    s,
    count=1
)

# 3) After user lookup, resolve version:
# - if requestedVersion use it
# - else read active_agreement.version
# - else fallback
marker = "if (!user)"
idx = s.find(marker)
if idx == -1:
    raise SystemExit("[ERR] Could not find user auth check marker in agreements accept route")

# Insert resolution after auth check block (after that return)
# We'll anchor after the line containing the auth return
m = re.search(r"if \(!user\)[^\n]*\n", s)
if not m:
    raise SystemExit("[ERR] Could not locate auth check line")
insert_at = m.end()

resolve_block = (
    "\n"
    "  // Resolve agreement version: request body > active agreement view > env fallback\n"
    "  let version: string | null = requestedVersion ?? null;\n"
    "  if (!version) {\n"
    "    const { data: active, error: activeErr } = await supabaseAdmin\n"
    "      .from(\"active_agreement\")\n"
    "      .select(\"version\")\n"
    "      .maybeSingle();\n"
    "    if (!activeErr) version = (active as any)?.version ?? null;\n"
    "  }\n"
    "  version = version ?? FALLBACK_VERSION;\n"
)

if "Resolve agreement version" not in s:
    s = s[:insert_at] + resolve_block + s[insert_at:]

# 4) Update upsert and profile update to use version variable
s = s.replace(
    "agreement_version: AGREEMENTS_VERSION",
    "agreement_version: version",
)
s = s.replace(
    "agreements_version: AGREEMENTS_VERSION",
    "agreements_version: version",
)

# Also update response version
s = s.replace(
    "return NextResponse.json({ ok: true, version: AGREEMENTS_VERSION });",
    "return NextResponse.json({ ok: true, version });",
)

p.write_text(s, encoding="utf-8")
print("[OK] patched agreements accept route to use requested/active agreement version")
