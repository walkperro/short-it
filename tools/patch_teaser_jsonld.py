import os, re, sys
from pathlib import Path

ROOT = Path.cwd()

JSONLD_PATH = ROOT / "src/lib/seo/jsonld.ts"

JSONLD_CONTENT = """// src/lib/seo/jsonld.ts

export function ideaJsonLd(opts: {
  title: string;
  description: string;
  url: string;
  publishedAt?: string | null;
  ticker?: string | null;
  level: "Ideas" | "Conviction";
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: opts.title,
    description: opts.description,
    datePublished: opts.publishedAt ?? undefined,
    dateModified: opts.publishedAt ?? undefined,
    author: {
      "@type": "Organization",
      name: "Short-It",
      url: "https://short-it.trade",
    },
    publisher: {
      "@type": "Organization",
      name: "Short-It",
      url: "https://short-it.trade",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": opts.url,
    },
    keywords: [
      opts.ticker,
      opts.level,
      "trade idea",
      "options",
      "market analysis",
    ].filter(Boolean),
  };
}
"""

def ensure_file(path: Path, content: str):
  path.parent.mkdir(parents=True, exist_ok=True)
  if path.exists():
    if path.read_text(encoding="utf-8").strip() == content.strip():
      print(f"OK: {path}")
      return
  path.write_text(content, encoding="utf-8")
  print(f"WROTE: {path}")

def ensure_import(tsx: str) -> str:
  if 'from "@/lib/seo/jsonld"' in tsx:
    return tsx
  m = re.search(r'^(import .*?;\\s*)+', tsx, flags=re.M)
  if m:
    return tsx[:m.end()] + 'import { ideaJsonLd } from "@/lib/seo/jsonld";\\n' + tsx[m.end():]
  return 'import { ideaJsonLd } from "@/lib/seo/jsonld";\\n' + tsx

def inject_after_main(tsx: str, snippet: str) -> str:
  if "application/ld+json" in tsx:
    return tsx
  return re.sub(r'(<main[^>]*>)', r'\\1\\n' + snippet, tsx, count=1)

def patch(path: Path, kind: str):
  if not path.exists():
    print(f"SKIP: {path}")
    return

  tsx = path.read_text(encoding="utf-8")
  tsx = ensure_import(tsx)

  if kind == "ideas":
    snippet = """  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(
        ideaJsonLd({
          title: `${idea?.ticker ?? "—"} — Idea #${idea?.idea_no ?? "—"}`,
          description: (idea?.teaser ?? idea?.summary ?? idea?.context ?? "").slice(0, 200),
          url: `https://short-it.trade/ideas/${idea?.slug ?? ""}`,
          publishedAt: idea?.published_at ?? null,
          ticker: idea?.ticker ?? null,
          level: "Ideas",
        }),
      ),
    }}
  />"""
  else:
    snippet = """  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(
        ideaJsonLd({
          title: `${idea?.ticker ?? "—"} — Conviction`,
          description: (conviction?.body ?? "").slice(0, 200),
          url: `https://short-it.trade/conviction/${idea?.slug ?? ""}`,
          publishedAt: conviction?.published_at ?? null,
          ticker: idea?.ticker ?? null,
          level: "Conviction",
        }),
      ),
    }}
  />"""

  tsx = inject_after_main(tsx, snippet)
  path.write_text(tsx, encoding="utf-8")
  print(f"PATCHED: {path}")

def main():
  ensure_file(JSONLD_PATH, JSONLD_CONTENT)
  patch(ROOT / "src/app/ideas/[slug]/page.tsx", "ideas")
  patch(ROOT / "src/app/conviction/[slug]/page.tsx", "conviction")
  print("DONE")
  return 0

if __name__ == "__main__":
  sys.exit(main())
