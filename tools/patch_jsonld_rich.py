from pathlib import Path
import re

p = Path("src/lib/seo/jsonld.ts")
src = p.read_text()

if "breadcrumbJsonLd" in src:
    print("[OK] Rich JSON-LD already present")
    exit(0)

patch = """

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function faqJsonLd(qas: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map((qa) => ({
      "@type": "Question",
      name: qa.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: qa.a,
      },
    })),
  };
}
"""

p.write_text(src + patch)
print("[OK] Added breadcrumbJsonLd + faqJsonLd")
