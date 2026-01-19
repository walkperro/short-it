from pathlib import Path

p = Path("src/app/api/me/plan/route.ts")
s = p.read_text(encoding="utf-8")

if "sync=1" in s:
    print("[OK] already patched")
    raise SystemExit(0)

needle = "export async function GET(_req: NextRequest) {"
idx = s.find(needle)
if idx == -1:
    raise SystemExit("[ERR] Could not find GET signature in /api/me/plan")

insert = """\
export async function GET(req: NextRequest) {
  // Optional: force a Stripe->Supabase plan refresh
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("sync") === "1") {
      const mod = await import("../../billing/sync/route");
      // reuse the same request; sync route reads auth from cookies
      await mod.POST(req as any);
    }
  } catch {
    // ignore
  }
"""

# Replace function signature block
s = s.replace("export async function GET(_req: NextRequest) {", insert)

p.write_text(s, encoding="utf-8")
print("[OK] patched", p)
