import Link from "next/link";
import { headers, cookies } from "next/headers";
import { getRequestBaseUrl } from "@/lib/server-url";

type Idea = {
  id: string;
  slug: string;
  title: string;
  ticker: string;
  direction: "long" | "short";
  teaser?: string | null;
  created_at: string;
};

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

function canUnlockIdeas(me: any) {
  if (!me?.user) return false;
  if (me?.is_admin) return true;
  const p = me?.plan ?? "free";
  return p === "ideas" || p === "conviction" || p === "macro";
}

export const runtime = "nodejs";

export default async function IdeasPage() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await getRequestBaseUrl().catch(() => "")) ??
    getBaseUrl();

  const cookieHeader = cookies().toString();

  // viewer
  const meRes = await fetch(`${base}/api/me`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);
  const meJson = await meRes?.json().catch(() => null);
  const unlock = canUnlockIdeas(meJson);

  // ideas list
  let items: Idea[] = [];
  let errorMsg: string | null = null;

  try {
    const res = await fetch(`${base}/api/ideas`, {
      cache: "no-store",
      headers: { cookie: cookieHeader },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) errorMsg = json?.error ?? `Failed to load ideas (${res.status})`;
    else items = (json?.data ?? []) as Idea[];
  } catch (e: any) {
    errorMsg = e?.message ?? "Failed to load ideas.";
  }

  const firstFour = items.slice(0, 4);

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Ideas</h1>
          <p className="mt-1 text-sm text-white/60">
            One free teaser. Unlock the rest with a plan.
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {firstFour.map((i, idx) => {
          const locked = idx > 0 && !unlock;

          if (locked) {
            return (
              <LockedIdeaCard key={i.id} />
            );
          }

          return (
            <Link
              key={i.id}
              href={`/ideas/${i.slug}`}
              className="min-w-[320px] max-w-[360px] shrink-0 rounded-2xl border border-white/10 bg-black/40 p-5 transition hover:border-white/20 hover:bg-black/60"
            >
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-widest text-white/50">{i.ticker}</div>
                <span
                  className={[
                    "rounded-full px-3 py-1 text-xs font-semibold",
                    i.direction === "long"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300",
                  ].join(" ")}
                >
                  {i.direction.toUpperCase()}
                </span>
              </div>

              <div className="mt-3 text-lg font-semibold leading-snug">{i.title}</div>

              {i.teaser ? (
                <p className="mt-3 line-clamp-3 text-sm text-white/70">{i.teaser}</p>
              ) : null}

              <div className="mt-4 text-xs text-white/40">
                {new Date(i.created_at).toLocaleString()}
              </div>

              {idx === 0 ? (
                <div className="mt-3 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  FREE TEASER
                </div>
              ) : null}
            </Link>
          );
        })}

        {!errorMsg && firstFour.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No published ideas yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}

function LockedIdeaCard() {
  return (
    <div className="relative min-w-[320px] max-w-[360px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5">
      <div className="pointer-events-none absolute inset-0 bg-black/30 backdrop-blur-[6px]" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 rounded bg-white/10" />
          <div className="h-6 w-20 rounded-full bg-white/10" />
        </div>

        <div className="mt-4 h-6 w-56 rounded bg-white/10" />
        <div className="mt-3 h-4 w-full rounded bg-white/10" />
        <div className="mt-2 h-4 w-5/6 rounded bg-white/10" />

        <div className="mt-6 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-white/5">
            <LockSvg />
          </div>
          <div>
            <div className="text-sm font-medium">Locked</div>
            <div className="text-xs text-white/60">Upgrade to unlock</div>
          </div>
        </div>

        <Link
          href="/subscribe"
          className="mt-5 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:opacity-90"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}

function LockSvg() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white/80">
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
