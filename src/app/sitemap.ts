import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";

  const now = new Date();
  const out: MetadataRoute.Sitemap = [];

  // Core pages you want indexed
  const staticPaths = ["/", "/ideas", "/pricing", "/info"];
  for (const p of staticPaths) {
    out.push({
      url: `${site}${p}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: p === "/" ? 1 : 0.7,
    });
  }

  // Teaser pages (indexable): Ideas
  try {
    const { data } = await supabaseAdmin
      .from("ideas_public")
      .select("slug,published_at,created_at,status")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(5000);

    for (const row of data ?? []) {
      const slug = row.slug;
      if (!slug) continue;
      const lm = row.published_at ?? row.created_at ?? now.toISOString();
      out.push({
        url: `${site}/ideas/${slug}`,
        lastModified: new Date(lm),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (e) {
    // If sitemap generation fails, we still want static sitemap to work
    console.warn("ideas_public sitemap fetch failed", e);
  }

  // Teaser pages (indexable): Conviction
  try {
    const { data } = await supabaseAdmin
      .from("convictions")
      .select("published_at,created_at,status,ideas:idea_id!inner(slug,status)")
      .eq("status", "published")
      .eq("ideas.status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(5000);

    for (const row of data ?? []) {
      const slug = (row as any)?.ideas?.slug;
      if (!slug) continue;
      const lm =
        (row as any).published_at ??
        (row as any).created_at ??
        now.toISOString();
      out.push({
        url: `${site}/conviction/${slug}`,
        lastModified: new Date(lm),
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  } catch (e) {
    console.warn("convictions sitemap fetch failed", e);
  }

  return out;
}
