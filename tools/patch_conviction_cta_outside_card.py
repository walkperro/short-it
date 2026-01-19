#!/usr/bin/env python3
from pathlib import Path
import re

p = Path("src/app/conviction/[slug]/page.tsx")
s = p.read_text(encoding="utf-8")

# Remove CTA block from inside the relative container
s2, n = re.subn(
    r'\s*\{allowed \? \(\s*<div className="mt-6">\s*<ReadFullConvictionCta href=\{`/conviction/\$\{slug\}/full`\} />\s*</div>\s*\) : null\}\s*',
    "\n",
    s,
    flags=re.M,
)
if n == 0:
    raise SystemExit("[ERR] Could not find the allowed CTA block inside the teaser card.")

s = s2

# Insert CTA right AFTER the card closes (after the big rounded-3xl div)
# We insert after: </div>                                          {!allowed ? (
# (the close of the rounded card, before the premium upsell block)
anchor = r'</div>\s*\{!allowed \?\s*\('
am = re.search(anchor, s)
if not am:
    raise SystemExit("[ERR] Could not find insertion anchor after the teaser card.")

insert = (
    '\n      {allowed ? (\n'
    '        <div className="mt-6">\n'
    '          <ReadFullConvictionCta href={`/conviction/${slug}/full`} />\n'
    '        </div>\n'
    '      ) : null}\n'
)

s = s[:am.start()] + insert + s[am.start():]

p.write_text(s, encoding="utf-8")
print("[OK] moved conviction teaser CTA outside the WSJ card:", p)
