import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ideas", "/pricing", "/info"],
        disallow: [
          "/admin",
          "/account",
          "/login",
          "/subscribe",
          "/macro",
          "/conviction",
          "/reset-password",
          "/update-password",
        ],
      },
    ],
    sitemap: "https://short-it.trade/sitemap.xml",
  };
}
