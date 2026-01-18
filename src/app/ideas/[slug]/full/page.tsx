import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { normalizePlan, type Plan } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type IdeaRow = {
  id: string;
  slug: string;
  idea_no?: number | null;
  status?: string | null;
  locked?: boolean | null;
  created_at: string;
  published_at?: string | null;
  kind?: string | null;
  ticker: string;
  direction?: "long" | "short" | null;
  entry?: string | null;
  reach?: string | null;
  option_side?: "call" | "put" | null;
  strike?: string | null;
  exp?: string | null;
  summary?: string | null;
  context?: string | null;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function isOptionKind(kind: string | null | undefined) {
  return kind === "Buy Option" || kind === "Sell Option";
}

function Field({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-xs tracking-widest text-white/40">{label}</div>
      <div className={strong ? "text-sm font-semibold" : "text-sm text-white/80"}>{value}</div>
    </div>
  );
}

function LockedFull() {
  return (
    <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
      <div className="text-xs tracking-widest text-white/50">LOCKED</div>
      <div className="mt-2 text-xl font-semibold">Upgrade to unlock this full idea</div>
      <p className="mt-2 text-sm text-white/70">This page is available to paying members.</p>
      <div className="mt-5 flex gap-3">
        <Link href="/subscribe" className="rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-black">
          Upgrade
        </Link>
        <Link href="/ideas" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10">
          Back to Ideas
        </Link>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const { data } = await supabaseAdmin
    .from("ideas_public")
    .select("ticker,idea_no,published_at,created_at,summary,context")
    .eq("slug", slug)
    .maybeSingle();

  const titleCore = data?.ticker ? `${data.ticker} — Idea` : "Idea";
  const title = data?.idea_no ? `${titleCore} #${pad3(Number(data.idea_no))}` : titleCore;
  const description = (data?.summary ?? data?.context ?? "Full trade idea.").slice(0, 160);

  return {
    title,
    description,
    robots: { index: false, follow: false }, // FULL pages should not be indexed
    alternates: { canonical: `/ideas/${slug}` },
    openGraph: { title, description, url: `/ideas/${slug}`, images: [{ url: "/og.png", width: 1200, height: 630, alt: "SHORT-IT — Trade Intel" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function IdeaFullPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let plan: Plan = "free";
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan,is_admin")
      .eq("id", user.id)
      .maybeSingle();

    plan = normalizePlan(profile?.plan ?? "free");
    isAdmin = isAdminEmail(user.email ?? null) || Boolean(profile?.is_admin);
  }

  const { data: idea } = await supabaseAdmin
    .from("ideas_public")
    .select("id,slug,idea_no,status,locked,created_at,published_at,kind,ticker,direction,entry,reach,option_side,strike,exp,summary,context")
    .eq("slug", slug)
    .maybeSingle();

  if (!idea) return notFound();

  const isFree = !isAdmin && plan === "free";
  const locked = isFree && Boolean((idea as any).locked);

  if (locked) {
    return (
      <main className="mx-auto max-w-3xl p-6 text-white">
        <div className="text-xs tracking-[0.35em] text-white/40">LEVEL I</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Idea</h1>
        <LockedFull />
      </main>
    );
  }

  const i = idea as any as IdeaRow;
  const when = i.published_at ?? i.created_at;

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.35em] text-white/40">LEVEL I</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {i.ticker} <span className="text-white/40">•</span> Idea #{i.idea_no ? pad3(Number(i.idea_no)) : "—"}
          </h1>
          <div className="mt-2 text-xs text-white/40">{new Date(when as any).toLocaleString()}</div>
        </div>

        <Link href={`/ideas/${i.slug}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
          View teaser
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-widest text-white/50">DETAILS</div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
            i.direction === "long" || i.option_side === "call" ? "bg-emerald-500/15 text-emerald-400" :
            i.direction === "short" || i.option_side === "put" ? "bg-red-500/15 text-red-400" :
            "bg-white/10 text-white/80"
          }`}>
            {(i.direction ?? i.option_side ?? "—").toUpperCase()}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3">
          <Field label="Ticker" value={i.ticker || "—"} strong />
          <Field label="Type" value={(i.kind ?? "—") as any} />
          <Field label="Entry" value={(i.entry ?? "—") as any} strong />
          <Field label="Target" value={(i.reach ?? "—") as any} />
          {isOptionKind(i.kind) ? (
            <>
              <Field label="Strike" value={(i.strike ?? "—") as any} />
              <Field label="Exp" value={(i.exp ?? "—") as any} />
            </>
          ) : null}
        </div>

        {(i.summary || i.context) ? (
          <div className="mt-6">
            <div className="text-xs tracking-widest text-white/40">CONTEXT</div>
            <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{(i.summary ?? i.context) as any}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
