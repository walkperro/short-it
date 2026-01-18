import type { MetadataRoute } from "next";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";
  const now = new Date();

  // Static/core pages
  const items: MetadataRoute.Sitemap = [
    { url: `${site}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${site}/ideas`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${site}/conviction`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    { url: `${site}/subscribe`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  // Ideas teasers
  const { data: ideas, error: ideasErr } = await supabaseAdmin
    .from("ideas_public")
    .select("slug,published_at,created_at")
    .not("slug", "is", null)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(5000);

  if (!ideasErr && ideas?.length) {
    for (const i of ideas) {
      const last = (i.published_at ?? i.created_at) ? new Date((i.published_at ?? i.created_at) as any) : now;
      items.push({
        url: `${site}/ideas/${i.slug}`,
        lastModified: last,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  // Conviction teasers (by idea slug)
  const { data: conv, error: convErr } = await supabaseAdmin
    .from("convictions")
    .select("published_at,created_at,ideas:idea_id!inner(slug)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(5000);

  if (!convErr && conv?.length) {
    for (const c of conv as any[]) {
      const slug = c?.ideas?.slug;
      if (!slug) continue;
      const last = (c.published_at ?? c.created_at) ? new Date((c.published_at ?? c.created_at) as any) : now;
      items.push({
        url: `${site}/conviction/${slug}`,
        lastModified: last,
        changeFrequency: "weekly",
        priority: 0.65,
      });
    }
  }

  return items;
}
