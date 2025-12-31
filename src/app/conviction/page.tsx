import Link from "next/link";
import { cookies } from "next/headers";
import { getRequestBaseUrl } from "@/lib/server-url";
import { canAccess, normalizePlan, type Plan } from "@/lib/entitlements";

type Idea = {
  id: string;
  slug: string;
  title: string;
  ticker: string;
  direction: "long" | "short";
  teaser?: string | null;
  created_at: string;
};

function LockedCard() {
  return (
    <div className="relative min-w-[320px] max-w-[360px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="pointer-events-none absolute inset-0 bg-black/10 backdrop-blur-[6px]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 rounded bg-white/10" />
          <div className="h-6 w-16 rounded-full bg-white/10" />
        </div>
        <div className="mt-4 h-5 w-3/4 rounded bg-white/10" />
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full rounded bg-white/10" />
          <div className="h-3 w-11/12 rounded bg-white/10" />
          <div className="h-3 w-2/3 rounded bg-white/10" />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="text-xs text-white/60">Locked</div>
          <Link
            href="/subscribe"
            className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/15 transition"
          >
            Upgrade to unlock 🔒
          </Link>
        </div>
      </div>
    </div>
  );
}

export const runtime = "nodejs";

export default async function ConvictionPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? (await getRequestBaseUrl());
  const cookieHeader = cookies().toString();

  const meRes = await fetch(`${baseUrl}/api/me`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);

  const meJson = await meRes?.json().catch(() => null);
  const plan: Plan = normalizePlan(meJson?.profile?.plan ?? meJson?.plan ?? "free") as Plan;
  const isAdmin: boolean = !!(meJson?.is_admin ?? meJson?.profile?.is_admin);

  let items: Idea[] = [];
  let errorMsg: string | null = null;

  try {
    const res = await fetch(`${baseUrl}/api/ideas`, { cache: "no-store" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) errorMsg = json?.error ?? `Failed to load ideas (${res.status})`;
    else items = (json?.data ?? []) as Idea[];
  } catch (e: any) {
    errorMsg = e?.message ?? "Failed to load ideas.";
  }

  const four = items.slice(0, 4);
  const allowed = isAdmin || canAccess("conviction", plan);

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Conviction</h1>
        <p className="mt-1 text-sm text-white/60">LEVEL II — only unlocked for Conviction+ members.</p>
      </div>

      {errorMsg && (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {four.map((i) => {
          if (!allowed) return <LockedCard key={`locked-${i.id}`} />;

          return (
            <Link
              key={i.id}
              href={`/ideas/${i.slug}`}
              className="min-w-[320px] max-w-[360px] shrink-0 rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-white/20 hover:bg-black/60"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-widest text-white/50">{i.ticker}</div>
                <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 text-white/80">
                  LEVEL II
                </span>
              </div>
              <div className="mt-3 text-lg font-semibold leading-snug">{i.title}</div>
              <p className="mt-3 text-sm text-white/70 line-clamp-3">
                Open to view conviction section.
              </p>
              <div className="mt-4 text-xs text-white/40">{new Date(i.created_at).toLocaleString()}</div>
            </Link>
          );
        })}

        {!errorMsg && four.length === 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No published ideas yet.
          </div>
        )}
      </div>
    </main>
  );
}
