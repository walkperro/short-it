#!/usr/bin/env python3
from __future__ import annotations
from pathlib import Path
import textwrap

ROOT = Path(__file__).resolve().parents[1]
robots_path = ROOT / "src/app/robots.ts"
sitemap_path = ROOT / "src/app/sitemap.ts"

def write_if_changed(path: Path, content: str) -> bool:
    if path.exists():
        old = path.read_text(encoding="utf-8")
        if old == content:
            print(f"[OK] no change {path.as_posix()}")
            return False
        bak = path.with_suffix(path.suffix + ".bak")
        bak.write_text(old, encoding="utf-8")
        print(f"[BK] backup -> {bak.as_posix()}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    print(f"[OK] wrote {path.as_posix()}")
    return True

robots_new = textwrap.dedent("""\
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep private/auth stuff out of the index
        disallow: [
          "/api/",
          "/admin",
          "/account",
          "/subscribe",
          "/portal",
          "/signin",
          "/signup",
          "/logout",
          // Avoid duplicate thin pages from querystring filter URLs
          "/*?*",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  };
}
""")

sitemap_new = textwrap.dedent("""\
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
      const lm = (row as any).published_at ?? (row as any).created_at ?? now.toISOString();
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
""")

changed = False
changed |= write_if_changed(robots_path, robots_new)
changed |= write_if_changed(sitemap_path, sitemap_new)

if not changed:
    print("[INFO] Nothing changed. You're already patched.")
