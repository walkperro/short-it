export function getSiteUrl() {
  // Prefer NEXT_PUBLIC_SITE_URL in prod; fallback to Vercel URL; fallback localhost.
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/+$/, "");

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;

  return "http://localhost:3000";
}
