#!/usr/bin/env python3
from pathlib import Path
import re

p = Path("src/components/ReadFullConvictionCta.tsx")
s = p.read_text(encoding="utf-8")

# Remove the arrow container block
s = re.sub(
    r'\s*<div className="flex h-9 w-9[\s\S]*?</div>\s*',
    "\n",
    s,
    flags=re.M
)

# Replace justify-between with items-start (since no arrow now)
s = s.replace(
    "flex items-center justify-between gap-6",
    "flex items-start gap-2"
)

# Slightly tighten subtitle text so it always fits
s = s.replace(
    'text-[9px] tracking-[0.28em]',
    'text-[8px] tracking-[0.26em]'
)

p.write_text(s, encoding="utf-8")
print("[OK] removed arrow from CTA:", p)
