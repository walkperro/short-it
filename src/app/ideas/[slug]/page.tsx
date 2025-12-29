import Link from "next/link";
import { headers, cookies } from "next/headers";
import { getRequestBaseUrl } from "@/lib/server-url";

type Idea = {
  id: string;
  slug: string;
  idea_no: number | null;
  created_at: string;
  published_at: string | null;
  status: string;
  locked: boolean;
  kind: string | null;
  ticker: string | null;
  direction: string | null;
  option_side: string | null;
  entry: string | null;
  reach: string | null;
  strike: string | null;
  exp: string | null;
  context: string | null;
};

async function getBaseUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "";
  return `${proto}://${host}`;
}

function canUnlock(me: any) {
  const plan = me?.profile?.plan ?? me?.plan ?? "free";
  const isAdmin = !!(me?.profile?.is_admin ?? me?.is_admin);
  if (!me?.user) return false;
  if (isAdmin) return true;
  return plan === "ideas" || plan === "conviction" || plan === "macro";
}

export const runtime = "nodejs";

export default async function IdeaDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (await getRequestBaseUrl().catch(() => "")) ??
    (await getBaseUrl());

  const cookieHeader = cookies().toString();

  // viewer / entitlements
  const meRes = await fetch(`${base}/api/me`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);
  const meJson = await meRes?.json().catch(() => null);
  const unlock = canUnlock(meJson);

  // idea
  const res = await fetch(`${base}/api/ideas/${slug}`, {
    cache: "no-store",
    headers: { cookie: cookieHeader },
  }).catch(() => null);

  const json = await res?.json().catch(() => ({}));
  const idea = (json?.data ?? null) as Idea | null;

  if (!res?.ok || !idea) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          This idea couldn't be loaded.
        </div>
        <Link href="/ideas" className="mt-4 inline-block text-sm underline underline-offset-4">
          Back to Ideas
        </Link>
      </main>
    );
  }

  const isLocked = !!idea.locked && !unlock;

  if (isLocked) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <div className="text-xl font-semibold">Locked</div>
          <p className="mt-2 text-sm text-white/60">Upgrade to unlock full details.</p>
          <Link
            href="/plans"
            className="mt-5 inline-flex rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Upgrade
          </Link>
        </div>
        <Link href="/ideas" className="mt-6 inline-block text-sm underline underline-offset-4">
          Back to Ideas
        </Link>
      </main>
    );
  }

  const badge = (idea.direction ?? idea.option_side ?? "—").toUpperCase();

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.35em] text-white/40">SHORT-IT</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {idea.ticker ?? "—"} <span className="text-white/40">•</span> {idea.kind ?? "Idea"}
          </h1>
          <div className="mt-2 text-xs text-white/40">
            {new Date(idea.published_at ?? idea.created_at).toLocaleString()}
          </div>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold">
          {badge}
        </span>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Field label="Ticker" value={idea.ticker ?? "—"} />
          <Field label="Type" value={idea.kind ?? "—"} />
          <Field label="Entry" value={idea.entry ?? "—"} />
          <Field label="Target" value={idea.reach ?? "—"} />

          <Field label="Strike" value={idea.strike ?? "—"} />
          <Field label="Exp" value={idea.exp ?? "—"} />
        </div>

        {idea.context ? (
          <div className="mt-6">
            <div className="text-xs tracking-widest text-white/40">Context</div>
            <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{idea.context}</p>
          </div>
        ) : null}
      </div>

      <Link href="/ideas" className="mt-6 inline-block text-sm underline underline-offset-4">
        Back to Ideas
      </Link>
    </main>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs tracking-widest text-white/40">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
