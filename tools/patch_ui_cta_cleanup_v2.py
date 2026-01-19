#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def read(p: Path) -> str:
    return p.read_text(encoding="utf-8")

def write(p: Path, s: str):
    p.write_text(s, encoding="utf-8")

def patch_conviction_slug_teaser():
    p = ROOT / "src/app/conviction/[slug]/page.tsx"
    s = read(p)

    # Ensure CTA import exists (after next/link import)
    if "ReadFullConvictionCta" not in s:
        s2, n = re.subn(
            r'(^\s*import\s+Link\s+from\s+["\']next/link["\'];\s*\n)',
            r'\1import ReadFullConvictionCta from "@/components/ReadFullConvictionCta";\n',
            s,
            flags=re.M
        )
        if n == 0:
            raise SystemExit("[ERR] Could not insert ReadFullConvictionCta import (no next/link import found).")
        s = s2

    # Remove the top-right "Read the full..." / "Subscribe to read..." block
    # Matches: <div className="mt-5"> ... {allowed ? ( <Link ...>Read ...</Link> ) : ( <Link ...>Subscribe ...</Link> )} </div>
    s = re.sub(
        r'\s*<div className="mt-5">\s*\{allowed \?\s*\([\s\S]*?\)\s*:\s*\([\s\S]*?\)\s*\}\s*<\/div>\s*',
        "\n",
        s,
        flags=re.M
    )

    # Remove bottom "Back to Convictions" link block
    s = re.sub(
        r'\s*<div className="mt-6">\s*<Link\b[^>]*href="\/conviction"[^>]*>[\s\S]*?Back to Convictions[\s\S]*?<\/Link>\s*<\/div>\s*',
        "\n",
        s,
        flags=re.M
    )

    # Insert CTA right after the wsjTeaser paragraph.
    # We only show CTA when allowed.
    if "<ReadFullConvictionCta" not in s:
        m = re.search(
            r'(<p[^>]*>\s*\{wsjTeaser\([\s\S]*?\)\}\s*<\/p>)',
            s
        )
        if not m:
            raise SystemExit("[ERR] Could not find wsjTeaser paragraph to insert CTA in conviction/[slug]/page.tsx")

        anchor = m.group(1)
        insert = (
            anchor
            + "\n"
            + "        {allowed ? (\n"
            + "          <div className=\"mt-6\">\n"
            + "            <ReadFullConvictionCta href={`/conviction/${slug}/full`} />\n"
            + "          </div>\n"
            + "        ) : null}\n"
        )
        s = s.replace(anchor, insert, 1)

    write(p, s)
    print("[OK] patched", p)

def remove_back_to_ideas_on_idea_teaser():
    p = ROOT / "src/app/ideas/[slug]/page.tsx"
    s = read(p)

    # Remove the "Back to Ideas" link block (common pattern)
    # Matches either:
    # <div className="mt-6"> <Link href="/ideas" ...>Back to Ideas</Link> </div>
    # OR a direct Link line with that text.
    s2 = re.sub(
        r'\s*<div className="mt-6">\s*<Link\b[^>]*href="\/ideas"[^>]*>[\s\S]*?Back to Ideas[\s\S]*?<\/Link>\s*<\/div>\s*',
        "\n",
        s,
        flags=re.M
    )
    s2 = re.sub(
        r'^\s*<Link\b[^>]*href="\/ideas"[^>]*>[\s\S]*?Back to Ideas[\s\S]*?<\/Link>\s*$',
        "",
        s2,
        flags=re.M
    )

    write(p, s2)
    print("[OK] removed Back to Ideas from", p)

def main():
    patch_conviction_slug_teaser()
    remove_back_to_ideas_on_idea_teaser()

if __name__ == "__main__":
    main()
