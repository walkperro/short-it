import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";
  const now = new Date();

  // ONLY pages you want indexed
  const paths = ["/", "/ideas", "/pricing", "/terms", "/privacy", "/info"];

  return paths.map((p) => ({
    url: `${site}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "/" ? 1 : 0.7,
  }));
}
