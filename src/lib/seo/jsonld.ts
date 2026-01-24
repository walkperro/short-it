type Level = "Ideas" | "Conviction";

export function ideaJsonLd(opts: {
  level?: Level;
  ideaNo?: number | null;
  ticker?: string | null;
  kind?: string | null;
  direction?: string | null;
  publishedAt?: string | null;
  teaser?: string | null;
}) {
  const level = opts.level ?? "Ideas";
  const ticker = (opts.ticker ?? "").toUpperCase();
  const headline = ticker
    ? `${ticker} — ${level}${opts.kind ? ` (${opts.kind})` : ""}`
    : `${level}${opts.kind ? ` (${opts.kind})` : ""}`;

  const desc =
    (opts.teaser && String(opts.teaser).trim()) ||
    `Teaser preview. Subscribe to unlock the full ${level.toLowerCase()} write-up.`;

  const published = opts.publishedAt ?? undefined;

  // Keep it safe + simple: Article schema. (Google understands it well.)
  const out: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description: desc,
  };

  if (published) out.datePublished = published;
  if (ticker) out.about = [{ "@type": "Thing", name: ticker }];
  if (opts.kind) out.articleSection = opts.kind;
  if (opts.direction) out.keywords = [String(opts.direction).toUpperCase()];

  // Optional extra metadata for richer SERP display
  if (opts.ideaNo != null) {
    out.identifier = {
      "@type": "PropertyValue",
      name: "ideaNo",
      value: String(opts.ideaNo),
    };
  }

  return out;
}
