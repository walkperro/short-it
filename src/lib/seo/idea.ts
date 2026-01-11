type Idea = {
  slug: string;
  ticker: string | null;
  kind: string | null;
  direction: string | null;
  option_side: string | null;
  context: string | null;
  published_at: string | null;
  created_at: string;
};

export function ideaTitle(i: Idea) {
  const t = (i.ticker ?? "—").toUpperCase();
  const dir = (i.direction ?? i.option_side ?? "").toUpperCase();
  const kind = (i.kind ?? "").trim();
  const parts = [t, dir || null, kind || null].filter(Boolean);
  return `${parts.join(" • ")} — SHORT-IT`;
}

export function ideaDescription(i: Idea) {
  const base = (i.context ?? "").toString().replace(/\s+/g, " ").trim();
  const d = base || "Tiered market idea for educational analysis only.";
  return d.length > 160 ? d.slice(0, 157) + "…" : d;
}

export function ideaJsonLd(site: string, i: Idea) {
  const url = `${site}/ideas/${i.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: ideaTitle(i),
    description: ideaDescription(i),
    mainEntityOfPage: url,
    url,
    publisher: { "@type": "Organization", name: "SHORT-IT", url: site },
    author: { "@type": "Organization", name: "SHORT-IT", url: site },
    datePublished: i.published_at ?? i.created_at,
    dateModified: i.published_at ?? i.created_at,
    about: [
      i.ticker ? i.ticker.toUpperCase() : undefined,
      i.kind ?? undefined,
      i.direction ?? i.option_side ?? undefined,
      "market analysis",
      "trade ideas",
    ].filter(Boolean),
  };
}
