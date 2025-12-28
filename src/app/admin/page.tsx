import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import AdminClient from "./AdminClient";
import { getRequestBaseUrl } from "@/lib/server-url";

export const runtime = "nodejs";

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

export default async function AdminPage() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await getRequestBaseUrl().catch(() => "")) ??
    (await getBaseUrl());

  const cookieHeader = cookies().toString();

  const meRes = await fetch(`${base}/api/me`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);

  const me = await meRes?.json().catch(() => null);

  // HARD BLOCK: if not admin, bounce away (prevents “typing /admin”)
  if (!me?.is_admin) redirect("/");

  return <AdminClient />;
}
