#!/usr/bin/env python3
import re, pathlib, sys

FILES = [
  "src/app/ideas/[slug]/page.tsx",
  "src/app/conviction/[slug]/page.tsx",
]

def patch_one(path: pathlib.Path) -> bool:
  s = path.read_text(encoding="utf-8")

  orig = s

  # --- Heuristic: if metadata/robots sets index:false for "locked" or "isFree" etc, flip to index:true ---
  # We keep "not found" (missing idea/row) as noindex. Only locked/teaser should be indexable.

  # Common patterns we try to fix:
  # robots: { index: false, follow: false }
  # inside a branch like: if (locked) return { ..., robots: { index:false } }
  # or: if (!allowed) return { ..., robots: { index:false } }

  def flip_robot_block(m):
    block = m.group(0)
    block = re.sub(r'index:\s*false', 'index: true', block)
    block = re.sub(r'follow:\s*false', 'follow: true', block)
    return block

  # Flip any robots blocks that appear on lines that also mention locked/allowed/isFree/canAccess
  lines = s.splitlines(True)
  out = []
  for i, line in enumerate(lines):
    out.append(line)
  s2 = "".join(out)

  # Targeted replace: robots blocks near "locked" conditions
  s2 = re.sub(
    r'(?s)(if\s*\([^)]*(locked|allowed|isFree|canAccess)[^)]*\)\s*return\s*\{.*?robots:\s*\{.*?\}.*?\};)',
    lambda m: flip_robot_block(m),
    s2
  )

  # Also fix inline robots in objects in the same file that mention locked
  s2 = re.sub(
    r'(?s)(locked[\s\S]{0,220}?robots:\s*\{[\s\S]{0,120}?\})',
    lambda m: flip_robot_block(m),
    s2
  )

  if s2 != orig:
    path.write_text(s2, encoding="utf-8")
    return True
  return False

changed = False
for f in FILES:
  p = pathlib.Path(f)
  if not p.exists():
    print(f"[WARN] missing {f}")
    continue
  if patch_one(p):
    print(f"[OK] patched {f}")
    changed = True
  else:
    print(f"[OK] no change {f}")

if not changed:
  print("[INFO] No teaser noindex patterns matched. You may already be indexable when locked.")
