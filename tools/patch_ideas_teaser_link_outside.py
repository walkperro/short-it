#!/usr/bin/env python3
from pathlib import Path
import re

p = Path("src/app/ideas/[slug]/page.tsx")
s = p.read_text(encoding="utf-8")

# 1) Remove "Back to Ideas" link section if present anywhere
s = re.sub(
    r'\s*<div className="mt-6">\s*<Link[^>]*href="/ideas"[\s\S]*?Back to Ideas[\s\S]*?</Link>\s*</div>\s*',
    "\n",
    s,
    flags=re.M,
)

# 2) Move the "To see the rest..." block OUTSIDE the main card
# Find the block:
# <div className="mt-4">
#   {isLockedForViewer ? ( <Link ...>To see the rest...</Link> ) : ( <Link ...>To see...</Link> )}
# </div>
# ...and replace it with a placeholder marker so we can re-insert it later outside the card.
m = re.search(r'(\s*<div className="mt-4">\s*\{isLockedForViewer[\s\S]*?\}\s*</div>\s*)', s)
if not m:
    raise SystemExit("[ERR] Could not find the 'To see the rest...' block in ideas teaser page.tsx")

block = m.group(1)

# Remove it from where it currently lives (inside the card)
s = s.replace(block, "\n")

# Insert it right AFTER the card div closes.
# We anchor on the first occurrence of: </div>                                          {isLockedForViewer ? (
# i.e. the spot right after the card ends, before the locked upsell block.
anchor = r'</div>\s*\{isLockedForViewer \?\s*\('
am = re.search(anchor, s)
if not am:
    raise SystemExit("[ERR] Could not find insertion anchor after the main card in ideas teaser page.tsx")

insert = (
    '\n      <div className="mt-5">\n'
    '        <div className="text-xs tracking-widest text-white/40">FULL DETAILS</div>\n'
    '        ' + block.strip() + '\n'
    '      </div>\n'
)

# Tweak the link styling inside that block so it stands out more (without being loud)
# Convert the link class to a more distinct look (slightly brighter + better hover)
insert = re.sub(
    r'className="text-sm text-white/70 underline underline-offset-4 hover:text-white"',
    r'className="text-sm text-white/85 underline underline-offset-4 hover:text-white"',
    insert
)

# Actually inject
s = s[:am.start()] + insert + s[am.start():]

p.write_text(s, encoding="utf-8")
print("[OK] moved ideas teaser full-details link outside card + removed Back to Ideas (if present):", p)
