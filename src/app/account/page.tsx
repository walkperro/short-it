import Link from "next/link";
import { headers, cookies } from "next/headers";
import { getRequestBaseUrl } from "@/lib/server-url";

export const runtime = "nodejs";

function nicePlan(plan: string) {
  if (!plan) return "Free";
  if (plan === "free") return "Free";
  if (plan === "ideas") return "Ideas";
  if (plan === "conviction") return "Conv";
  if (plan === "macro") return "Macro";
  if (plan === "admin") return "Admin";
  return plan;
}

export default async function AccountPage() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await getRequestBaseUrl().catch(() => ""));

  const cookieHeader = cookies().toString();

  const meRes = await fetch(`${base}/api/me`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);

  const me = await meRes?.json().catch(() => null);

  const email = me?.user?.email ?? "—";
  const isAdmin = !!me?.is_admin;
  const plan = isAdmin ? "admin" : (me?.profile?.plan ?? "free");

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <h1 className="text-4xl font-semibold tracking-tight">Account</h1>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="text-sm text-white/60">Signed in as</div>
        <div className="mt-1 text-lg font-semibold">{email}</div>

        <div className="mt-6 text-sm text-white/60">Plan</div>
        <div className="mt-1 text-2xl font-semibold">{nicePlan(plan)}</div>

        <div className="mt-6 flex gap-3">
          <Link
            href="/subscribe"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80"
          >
            Manage billing / upgrade
          </Link>

          {/* Sign out (POST) */}
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
