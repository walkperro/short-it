#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def write(p: Path, s: str):
    p.write_text(s, encoding="utf-8")

def remove_ideas_conviction_cta():
    p = ROOT / "src/app/ideas/[slug]/page.tsx"
    s = read(p)

    # Remove import if present
    s = re.sub(r'^\s*import\s+ReadFullConvictionCta\s+from\s+["\']@/components/ReadFullConvictionCta["\'];\s*\n', '', s, flags=re.M)

    # Remove any JSX usage of the component (self closing)
    s = re.sub(r'^\s*<ReadFullConvictionCta\b[^>]*\/>\s*\n', '', s, flags=re.M)

    # Remove any JSX usage of the component (open/close)
    s = re.sub(r'^\s*<ReadFullConvictionCta\b[\s\S]*?<\/ReadFullConvictionCta>\s*\n', '', s, flags=re.M)

    write(p, s)
    print("[OK] removed Conviction CTA from", p)

def patch_conviction_teaser_page():
    p = ROOT / "src/app/conviction/[slug]/page.tsx"
    s = read(p)

    # Ensure import exists
    if "ReadFullConvictionCta" not in s:
        # Insert after existing next/link import (common pattern)
        s = re.sub(
            r'(^\s*import\s+Link\s+from\s+["\']next/link["\'];\s*\n)',
            r'\1import ReadFullConvictionCta from "@/components/ReadFullConvictionCta";\n',
            s,
            flags=re.M
        )

    # Remove the "Read the full conviction →" top-right link if present
    # (handles either exact text or any Link whose href points to /conviction/${slug}/full)
    s = re.sub(
        r'\s*<Link\b[^>]*href=\{`\/conviction\/\$\{slug\}\/full`\}[\s\S]*?<\/Link>\s*',
        '\n',
        s,
        flags=re.M
    )
    s = re.sub(
        r'\s*<Link\b[^>]*>[\s\S]*?Read the full conviction[\s\S]*?<\/Link>\s*',
        '\n',
        s,
        flags=re.M
    )

    # Remove any "Back to Convictions" bottom link on teaser page
    s = re.sub(
        r'\s*<Link\b[^>]*>[\s\S]*?Back to Convictions[\s\S]*?<\/Link>\s*',
        '\n',
        s,
        flags=re.M
    )

    # Insert CTA component in the PREVIEW card area.
    # We insert right after the teaser paragraph (the <p> that renders {teaser})
    if "<ReadFullConvictionCta" not in s:
        # Find the teaser paragraph that contains {teaser}
        m = re.search(r'(<p[^>]*>\s*\{teaser\}\s*<\/p>)', s)
        if not m:
            raise SystemExit("[ERR] Could not find teaser <p>{teaser}</p> insertion point in conviction/[slug]/page.tsx")

        insert = m.group(1) + "\n\n        <ReadFullConvictionCta href={`/conviction/${slug}/full`} />\n"
        s = s.replace(m.group(1), insert, 1)

    write(p, s)
    print("[OK] patched", p)

def main():
    remove_ideas_conviction_cta()
    patch_conviction_teaser_page()

if __name__ == "__main__":
    main()
