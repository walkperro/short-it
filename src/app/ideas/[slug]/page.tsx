import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { normalizePlan, type Plan } from "@/lib/entitlements";
import { ideaJsonLd } from "@/lib/seo/jsonld";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type IdeaRow = {
  id: string;
  slug: string;
  idea_no: number | null;
  status: string | null;
  locked: boolean | null;
  created_at: string;
  published_at: string | null;

  kind: string | null;
  ticker: string | null;
  direction: string | null;
  option_side: string | null;
  entry: string | null;
  reach: string | null;
  strike: string | null;
  exp: string | null;

  summary: string | null;
  context: string | null;
};

function pad3(n?: number | null) {
  if (!n) return "—";
  return String(n).padStart(3, "0");
}

function upper(v?: string | null) {
  return (v ?? "—").toUpperCase();
}

async function getViewerPlan() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let plan: Plan = "free";
  let isAdmin = false;

  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan,is_admin")
      .eq("id", user.id)
      .maybeSingle();

    plan = normalizePlan(profile?.plan ?? "free");
    isAdmin =
      isAdminEmail(user.email ?? null) || Boolean(profile?.is_admin);
  }

  return { plan, isAdmin };
}

async function getIdeaBySlug(slug: string) {
  const { data } = await supabaseAdmin
    .from("ideas_public")
    .select(
      "id,slug,idea_no,status,locked,created_at,published_at,kind,ticker,direction,option_side,entry,reach,strike,exp,summary,context",
    )
    .eq("slug", slug)
    .maybeSingle();

  return (data ?? null) as IdeaRow | null;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";
  const teaserUrl = `${site}/ideas/${slug}`;
  const idea = await getIdeaBySlug(slug);

  if (!idea) return { title: "Idea", robots: { index: false, follow: false } };

  const titleBits = [
    idea.ticker ? idea.ticker.toUpperCase() : "Idea",
    idea.kind ? `• ${idea.kind}` : "",
    idea.idea_no ? `• #${pad3(idea.idea_no)}` : "",
  ].filter(Boolean);

  const desc =
    idea.summary ??
    idea.context ??
    "Timestamped trade intel teaser — subscribe to unlock full details.";

  return {
    title: titleBits.join(" "),
    description: desc,
    alternates: { canonical: `/ideas/${slug}` },
    openGraph: {
      title: titleBits.join(" "),
      description: desc,
      url: `/ideas/${slug}`,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "SHORT-IT — Trade Intel" }],
    },
    twitter: {
      card: "summary_large_image",
      title: titleBits.join(" "),
      description: desc,
      images: ["/og.png"],
    },
  };
}

export default async function IdeaTeaserPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const [viewer, idea] = await Promise.all([getViewerPlan(), getIdeaBySlug(slug)]);
  if (!idea) return notFound();

  const isFree = !viewer.isAdmin && viewer.plan === "free";
  const isLockedForViewer = isFree && Boolean(idea.locked);

  const whenISO = (idea.published_at ?? idea.created_at) as any;
  const teaser =
    idea.summary ?? idea.context ?? "Subscribe to unlock the full write-up.";

  const jsonLd = ideaJsonLd({
    ideaNo: idea.idea_no ?? null,
    ticker: idea.ticker ?? null,
    kind: idea.kind ?? null,
    direction: (idea.direction ?? idea.option_side ?? null) as any,
    publishedAt: idea.published_at ?? idea.created_at,
    teaser,
  });

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="level-fade text-xs tracking-[0.35em] text-white/40">LEVEL I</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {idea.ticker ? idea.ticker.toUpperCase() : "Idea"}{" "}
            <span className="text-white/30">•</span>{" "}
            <span className="text-white/80">{idea.kind ?? "—"}</span>
          </h1>
          <div className="mt-2 text-sm text-white/60">
            IDEA #{pad3(idea.idea_no)} • {new Date(whenISO).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/ideas"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
          >
            Back
          </Link>
          {isLockedForViewer ? (
            <Link
              href="/subscribe"
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
            >
              Subscribe
            </Link>
          ) : null}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        <div className="grid grid-cols-2 gap-x-10 gap-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-widest text-white/40">TICKER</div>
            <div className="font-semibold">{idea.ticker?.toUpperCase() ?? "—"}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-widest text-white/40">TYPE</div>
            <div className="text-white/80">{idea.kind ?? "—"}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-widest text-white/40">DIRECTION</div>
            <div className="font-semibold">{upper(idea.direction ?? idea.option_side)}</div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs tracking-widest text-white/40">ENTRY</div>
            <div className="text-white/80">{idea.entry ?? "—"}</div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs tracking-widest text-white/40">PREVIEW</div>
          <p className="mt-2 text-sm text-white/70 leading-relaxed">
            {teaser}
          </p>
        </div>

        {isLockedForViewer ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/80">
              This idea is locked. Subscribe to unlock the full breakdown + updates.
            </div>
            <div className="mt-4 flex gap-3">
              <Link
                href="/subscribe"
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black"
              >
                Unlock access
              </Link>
              <Link
                href="/ideas"
                className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
              >
                Browse more
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
