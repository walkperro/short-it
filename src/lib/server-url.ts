import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/site-url";

// For Server Components: prefer NEXT_PUBLIC_SITE_URL, otherwise derive from request headers.
export function getRequestBaseUrl() {
  const env = getSiteUrl();
  if (env && env !== "http://localhost:3000") return env;

  const h = headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  return `${proto}://${host}`;
}
