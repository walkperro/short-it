from pathlib import Path
import re

p = Path("src/app/api/agreements/accept/route.ts")
s = p.read_text(encoding="utf-8")

# Ensure supabaseAdmin is imported from server (you already have it)
if 'agreement_acceptances' in s:
    print("[OK] agreement_acceptances already referenced; skipping")
    raise SystemExit(0)

# Insert upsert block right before the profiles update
marker = r"await supabaseAdmin\s*\.from\(\"profiles\"\)"
m = re.search(marker, s)
if not m:
    raise SystemExit('[ERR] Could not find profiles update block insertion point')

insert = """
  // ✅ Record acceptance (source of truth for purchase gate)
  // Requires a unique constraint on (user_id, agreement_version) OR it will create duplicates.
  await supabaseAdmin
    .from("agreement_acceptances")
    .upsert(
      {
        user_id: user.id,
        agreement_version: AGREEMENTS_VERSION,
      },
      { onConflict: "user_id,agreement_version" },
    );

"""

s2 = s[:m.start()] + insert + s[m.start():]

p.write_text(s2, encoding="utf-8")
print(f"[OK] patched {p}")
