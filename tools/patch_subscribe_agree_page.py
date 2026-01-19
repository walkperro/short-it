from pathlib import Path
import re

p = Path("src/app/subscribe/agree/page.tsx")
s = p.read_text(encoding="utf-8")

# 1) Ensure accept call posts {version} (already does) — keep it.
# 2) After accept succeeds, call /api/billing/sync (optional but helps)
if "await fetch(\"/api/billing/sync\"" not in s:
    s = s.replace(
        "if (!a.ok) throw new Error(aj?.error ?? \"Failed to record acceptance\");",
        "if (!a.ok) throw new Error(aj?.error ?? \"Failed to record acceptance\");\n"
        "      // refresh server-side state (plan sync not required, but keeps profile fresh)\n"
        "      try { await fetch(\"/api/billing/sync\", { method: \"POST\" }); } catch {}"
    )

# 3) Add refund checkbox conditional display based on agreement body containing keywords
if "const showRefund" not in s:
    # Insert after allChecked useMemo
    s = s.replace(
        "const allChecked = useMemo(() => c1 && c2 && c3, [c1, c2, c3]);",
        "const allChecked = useMemo(() => c1 && c2 && (showRefund ? c3 : true), [c1, c2, c3, showRefund]);\n"
        "  const showRefund = useMemo(() => {\n"
        "    const b = String(agreement?.body ?? \"\").toLowerCase();\n"
        "    return b.includes(\"refund\") || b.includes(\"cancellation\") || b.includes(\"cancel\");\n"
        "  }, [agreement]);"
    )

# 4) Wrap checkbox #3 rendering
# Find the label for c3 and wrap it
pattern = r'(<label className="flex items-start gap-3 text-sm text-white/80">\s*<input[^>]*checked={c3}[^>]*>[\s\S]*?<\/label>)'
m = re.search(pattern, s)
if m and "showRefund" not in m.group(1):
    block = m.group(1)
    wrapped = "{showRefund ? (\n" + block + "\n) : null}"
    s = s.replace(block, wrapped)

p.write_text(s, encoding="utf-8")
print("[OK] patched subscribe/agree page: sync after accept + hide refund checkbox if not in agreement body")
