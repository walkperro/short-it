from pathlib import Path
import re, sys

ROOT = Path(__file__).resolve().parents[1]

JSONLD = ROOT / "src/lib/seo/jsonld.ts"
IDEAS = ROOT / "src/app/ideas/[slug]/page.tsx"
CONV  = ROOT / "src/app/conviction/[slug]/page.tsx"

def ensure_jsonld_helpers():
    if not JSONLD.exists():
        print(f"[ERR] Missing {JSONLD}")
        sys.exit(1)

    s = JSONLD.read_text(encoding="utf-8")

    changed = False

    if "export function breadcrumbJsonLd" not in s:
        s += """

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };
}
"""
        changed = True

    if changed:
        JSONLD.write_text(s, encoding="utf-8")
        print(f"[OK] updated {JSONLD}")
    else:
        print(f"[OK] no change {JSONLD}")

def patch_page(path: Path, mode: str):
    if not path.exists():
        print(f"[ERR] Missing {path}")
        sys.exit(1)

    s = path.read_text(encoding="utf-8")
    orig = s

    # 1) Import helpers
    # If already importing ideaJsonLd, expand it. If using default import form, skip gracefully.
    s = re.sub(
        r'import\s*\{\s*ideaJsonLd\s*\}\s*from\s*[\'"]@/lib/seo/jsonld[\'"];',
        'import { ideaJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";',
        s,
        flags=re.M
    )

    # 2) Ensure `site` is declared before any usage in generateMetadata AND in the component body
    # We'll add a local `site` in the component near other constants (safe).
    if 'const site = process.env.NEXT_PUBLIC_SITE_URL' not in s:
        # put near top-level helpers; but safest is inside component where slug exists
        # We'll insert after "const { slug } = await props.params;"
        s = re.sub(
            r'(const\s*\{\s*slug\s*\}\s*=\s*await\s*props\.params;\s*)',
            r'\1\n\n    const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";\n',
            s,
            count=1
        )

    # 3) Add breadcrumbLd + faqLd right after `const jsonLd = ideaJsonLd({ ... });`
    if "const breadcrumbLd" not in s:
        if mode == "ideas":
            inject = r"""
    const breadcrumbLd = breadcrumbJsonLd([
      { name: "Short-It", url: site },
      { name: "Ideas", url: `${site}/ideas` },
      { name: (idea.ticker ? idea.ticker.toUpperCase() : "Idea"), url: `${site}/ideas/${slug}` },
    ]);

    const faqLd = faqJsonLd([
      { q: "Is this a real trade idea?", a: "This is an educational trade idea preview. Full analysis is available to members." },
      { q: "How do I unlock the full idea?", a: "Subscribe to Short-It to access the full breakdown, updates, and conviction context." },
    ]);
"""
        else:
            inject = r"""
    const breadcrumbLd = breadcrumbJsonLd([
      { name: "Short-It", url: site },
      { name: "Conviction", url: `${site}/conviction` },
      { name: (idea.ticker ? idea.ticker.toUpperCase() : "Conviction"), url: `${site}/conviction/${slug}` },
    ]);

    const faqLd = faqJsonLd([
      { q: "What is a conviction trade?", a: "Conviction includes deeper analysis, risk framing, and macro alignment." },
      { q: "Is this financial advice?", a: "No. Short-It content is educational only. Always do your own research." },
    ]);
"""
        s = re.sub(
            r'(const\s+jsonLd\s*=\s*ideaJsonLd\(\{[\s\S]*?\}\);\s*)',
            r'\1' + inject,
            s,
            count=1
        )

    # 4) Add two extra JSON-LD <script> tags under the existing jsonLd script (only once)
    if "JSON.stringify(breadcrumbLd)" not in s:
        s = re.sub(
            r'(<script\s*\n\s*type="application/ld\+json"\s*\n\s*dangerouslySetInnerHTML=\{\{\s*__html:\s*JSON\.stringify\(jsonLd\)\s*\}\}\s*\n\s*/>\s*)',
            r'\1'
            r'\n        <script\n          type="application/ld+json"\n          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}\n        />\n'
            r'        <script\n          type="application/ld+json"\n          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}\n        />\n',
            s,
            count=1
        )

    if s != orig:
        path.write_text(s, encoding="utf-8")
        print(f"[OK] patched {path}")
    else:
        print(f"[OK] no change {path}")

def main():
    ensure_jsonld_helpers()
    patch_page(IDEAS, "ideas")
    patch_page(CONV, "conviction")

if __name__ == "__main__":
    main()
