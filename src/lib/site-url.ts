export function getSiteUrl() {
  // 1) Explicit canonical URL (recommended)
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");

  // 2) Vercel provided URL (works in preview/prod)
  const vercel =
    process.env.NEXT_PUBLIC_VERCEL_URL?.trim() ||
    process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  // 3) Local dev
  return "http://localhost:3000";
}
