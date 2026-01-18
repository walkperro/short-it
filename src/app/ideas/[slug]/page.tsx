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
  created_at: string;
  published_at?: string | null;
  kind?: string | null;
  ticker: string;
  direction?: "long" | "short" | null;
  option_side?: "call" | "put" | null;
  summary?: string | null;
  context?: string | null;
};

function pad3(n: number) {
  return String(n).padStart(3, "0");
}

function clampText(s: string, n: number) {
  const t = (s ?? "").trim();
  if (!t) return "";
  return t.length <= n ? t : `${t.slice(0, n).trimEnd()}…`;
}

function dirBadge(direction?: string | null, optionSide?: string | null) {
  const raw = (direction ?? optionSide ?? "—") as any;
  const up = String(raw).toUpperCase();
  const cls =
    raw === "long" || raw === "call"
      ? "bg-emerald-500/15 text-emerald-400"
      : raw === "short" || raw === "put"
      ? "bg-red-500/15 text-red-400"
      : "bg-white/10 text-white/80";
  return { up, cls };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;

  const { data } = await supabaseAdmin
    .from("ideas_public")
    .select("ticker,idea_no,summary,context")
    .eq("slug", slug)
    .maybeSingle();

  const titleCore = data?.ticker ? `${data.ticker} — Idea` : "Idea";
  const title = data?.idea_no ? `${titleCore} #${pad3(Number(data.idea_no))}` : titleCore;
  const description = clampText((data?.summary ?? data?.context ?? "Teaser for a Short-It trade idea.") as any, 160);

  return {
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: `/ideas/${slug}` },
    openGraph: { title, description, url: `/ideas/${slug}`, images: [{ url: "/og.png", width: 1200, height: 630, alt: "SHORT-IT — Trade Intel" }] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function IdeaTeaserPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Determine viewer plan (so we can show a "View full" button for paid)
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

  const isFree = !isAdmin && plan === "free";

  const { data: idea } = await supabaseAdmin
    .from("ideas_public")
    .select("id,slug,idea_no,created_at,published_at,kind,ticker,direction,option_side,summary,context")
    .eq("slug", slug)
    .maybeSingle();

  if (!idea) return notFound();

  const i = idea as any as IdeaRow;
  const when = i.published_at ?? i.created_at;
  const preview = clampText((i.summary ?? i.context ?? "") as any, 280);
  const b = dirBadge(i.direction ?? null, i.option_side ?? null);

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

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${b.cls}`}>{b.up}</span>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="flex items-center justify-between">
          <div className="text-xs tracking-widest text-white/50">TEASER</div>
          {!isFree ? (
            <Link href={`/ideas/${slug}/full`} className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black">
              View full
            </Link>
          ) : (
            <Link href="/subscribe" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black">
              Upgrade
            </Link>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          <div className="text-sm text-white/80">
            <span className="text-xs tracking-widest text-white/40">TYPE</span>{" "}
            <span className="ml-2">{i.kind ?? "—"}</span>
          </div>
          <div className="text-sm text-white/80">
            <span className="text-xs tracking-widest text-white/40">DETAILS</span>{" "}
            <span className="ml-2 text-white/60">Entry/targets are members-only.</span>
          </div>
        </div>

        {preview ? (
          <div className="mt-5">
            <div className="text-xs tracking-widest text-white/40">WHY IT’S ON THE RADAR</div>
            <p className="mt-2 text-sm text-white/70 whitespace-pre-wrap">{preview}</p>
          </div>
        ) : (
          <p className="mt-5 text-sm text-white/60">Upgrade to see the full rationale and levels.</p>
        )}
      </div>

      <div className="mt-5 flex gap-3">
        <Link href="/ideas" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80 hover:bg-white/10">
          Back to Ideas
        </Link>
        <Link href="/subscribe" className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm text-white hover:bg-white/15 transition">
          Become a member
        </Link>
      </div>
    </main>
  );
}
