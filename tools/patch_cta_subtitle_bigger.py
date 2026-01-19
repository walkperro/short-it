#!/usr/bin/env python3
from pathlib import Path
import re

p = Path("src/components/ReadFullConvictionCta.tsx")
s = p.read_text(encoding="utf-8")

# Make subtitle a touch bigger (was 8px)
s = re.sub(r'text-\[8px\]', 'text-[10px]', s)
# Slightly loosen tracking back (optional, but helps readability at 10px)
s = re.sub(r'tracking-\[0\.26em\]', 'tracking-[0.24em]', s)

p.write_text(s, encoding="utf-8")
print("[OK] updated CTA subtitle sizing:", p)
