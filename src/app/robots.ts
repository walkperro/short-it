import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";
  const host = site.replace(/^https?:\/\//, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/account/",
          "/subscribe/",
        ],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host,
  };
}
