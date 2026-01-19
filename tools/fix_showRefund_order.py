from pathlib import Path
import re

p = Path("src/app/subscribe/agree/page.tsx")
s = p.read_text(encoding="utf-8")

# Remove any existing showRefund + allChecked block we inserted (best-effort)
s = re.sub(
    r"const allChecked = useMemo\([\s\S]*?\);\s*\n\s*const showRefund = useMemo\([\s\S]*?\);\s*",
    "",
    s,
    count=1,
)

# Insert correct order right after c1/c2/c3 state declarations
anchor = "const [c3, setC3] = useState(false);"
if anchor not in s:
    raise SystemExit("[ERR] Could not find c3 state anchor")

insert = (
    anchor
    + "\n"
    + "  const showRefund = useMemo(() => {\n"
      "    const b = String(agreement?.body ?? \"\").toLowerCase();\n"
      "    return b.includes(\"refund\") || b.includes(\"cancellation\") || b.includes(\"cancel\");\n"
      "  }, [agreement]);\n"
      "\n"
      "  const allChecked = useMemo(\n"
      "    () => c1 && c2 && (showRefund ? c3 : true),\n"
      "    [c1, c2, c3, showRefund],\n"
      "  );\n"
)

s = s.replace(anchor, insert)

p.write_text(s, encoding="utf-8")
print("[OK] reordered showRefund before allChecked")
