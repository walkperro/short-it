from pathlib import Path

p = Path("src/app/api/stripe/checkout/route.ts")
s = p.read_text(encoding="utf-8")

needle = "export async function POST"
i = s.find(needle)
if i < 0:
    raise SystemExit("[ERR] Could not find export async function POST")

# Walk forward from POST() and find where its brace-balance returns to 0
j = s.find("{", i)
if j < 0:
    raise SystemExit("[ERR] Could not find opening { for POST()")

balance = 0
in_str = None
esc = False
in_line_comment = False
in_block_comment = False

k = j
while k < len(s):
    ch = s[k]
    nxt = s[k+1] if k+1 < len(s) else ""

    # Comments
    if in_line_comment:
        if ch == "\n":
            in_line_comment = False
        k += 1
        continue
    if in_block_comment:
        if ch == "*" and nxt == "/":
            in_block_comment = False
            k += 2
            continue
        k += 1
        continue

    # Strings
    if in_str:
        if esc:
            esc = False
        elif ch == "\\":
            esc = True
        elif ch == in_str:
            in_str = None
        k += 1
        continue

    # Start comments
    if ch == "/" and nxt == "/":
        in_line_comment = True
        k += 2
        continue
    if ch == "/" and nxt == "*":
        in_block_comment = True
        k += 2
        continue

    # Start strings
    if ch in ("'", '"', "`"):
        in_str = ch
        k += 1
        continue

    # Braces
    if ch == "{":
        balance += 1
    elif ch == "}":
        balance -= 1
        if balance == 0:
            # End of POST() block found at k (inclusive)
            end = k + 1
            out = s[:end].rstrip() + "\n"
            p.write_text(out, encoding="utf-8")
            print(f"[OK] trimmed {p} to end of POST() (len={len(out)})")
            raise SystemExit(0)

    k += 1

raise SystemExit("[ERR] Did not find POST() end; brace balance never returned to 0")
