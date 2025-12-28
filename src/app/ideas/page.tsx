import Link from "next/link";
import { headers, cookies } from "next/headers";
import { getRequestBaseUrl } from "@/lib/server-url";

type Idea = {
  id: string;
  slug: string;
  idea_no: number;
  status: "draft" | "published";
  locked: boolean;
  created_at: string;
  published_at: string | null;

  kind: string | null;
  ticker: string;
  direction: "long" | "short" | null;
  entry: number | null;
  reach: number | null;
  option_side: "call" | "put" | null;
  context: string | null;
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

function fmtIdeaNo(n: number) {
  return String(n).padStart(3, "0");
}

function isOptionKind(kind: string | null) {
  return kind === "Buy Option" || kind === "Sell Option";
}

export const runtime = "nodejs";

export default async function IdeasPage() {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await getRequestBaseUrl().catch(() => "")) ??
    (await getBaseUrl());

  const cookieHeader = cookies().toString();

  // viewer
  const meRes = await fetch(`${base}/api/me`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);
  const me = await meRes?.json().catch(() => null);

  const unlock = canUnlockIdeas(me);
  const isFree = (me?.plan ?? "free") === "free";

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
            {isFree ? "Upgrade to see more trade ideas." : "Trade ideas updated regularly."}
          </p>
        </div>
      </div>

      {errorMsg ? (
        <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {errorMsg}
        </div>
      ) : null}

      <div className="mt-8 flex gap-4 overflow-x-auto pb-4">
        {firstFour.map((i) => {
          const option = isOptionKind(i.kind);
          const lockedForViewer = i.locked && !unlock;

          const postedAt = i.published_at ?? i.created_at;

          const Card = (
            <div className="min-w-[320px] max-w-[360px] shrink-0 rounded-2xl border border-white/10 bg-black/40 p-5">
              <div className="flex items-center justify-between">
                <div className="text-xs tracking-widest text-white/50">
                  IDEA #{fmtIdeaNo(i.idea_no)}
                </div>
                {lockedForViewer ? (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                    LOCKED
                  </span>
                ) : (
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                    VIEW
                  </span>
                )}
              </div>

              <div className="mt-3 text-xs text-white/40">{new Date(postedAt).toLocaleString()}</div>

              <div className="mt-4 space-y-2 text-sm text-white/85">
                <Row label="Type" value={i.kind || "—"} />
                <Row label="Ticker" value={i.ticker} />
                {!option ? <Row label="Direction" value={(i.direction || "—").toUpperCase()} /> : null}
                <Row label="Entry" value={i.entry == null ? "—" : String(i.entry)} />
                {option ? (
                  <Row label="Call/Put" value={(i.option_side || "—").toUpperCase()} />
                ) : null}
                <Row label="Reach" value={i.reach == null ? "—" : String(i.reach)} />
              </div>

              {i.context ? (
                <p className="mt-4 line-clamp-4 text-sm text-white/70">{i.context}</p>
              ) : null}

              {lockedForViewer ? (
                <div className="mt-5 inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                  Upgrade to unlock
                </div>
              ) : null}
            </div>
          );

          if (lockedForViewer) {
            return (
              <div key={i.id} className="relative">
                <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-black/30 backdrop-blur-[6px]" />
                <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                  <div className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-sm text-white/90">
                    Locked •{" "}
                    <Link href="/subscribe" className="underline">
                      Upgrade
                    </Link>
                  </div>
                </div>
                {Card}
              </div>
            );
          }

          return (
            <Link key={i.id} href={`/ideas/${i.slug}`} className="block">
              {Card}
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-xs tracking-widest text-white/50">{label}</div>
      <div className="text-sm font-semibold text-white/90">{value}</div>
    </div>
  );
}
