import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { canAccess, normalizePlan, type Plan } from "@/lib/entitlements";
import { ideaJsonLd } from "@/lib/seo/jsonld";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type IdeaLite = {
  slug: string | null;
  idea_no: number | null;
  ticker: string | null;
  kind: string | null;
  direction: string | null;
  option_side: string | null;
  created_at: string;
  published_at: string | null;
  summary: string | null;
  context: string | null;
};

type ConvictionRow = {
  id: string;
  status: string | null;
  created_at: string;
  published_at: string | null;
  body?: string | null; // only selected when allowed
  ideas: IdeaLite | null;
};

function pad3(n?: number | null) {
  if (!n) return "—";
  return String(n).padStart(3, "0");
}

async function getViewerAccess() {
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

    plan = normalizePlan(profile?.plan ?? "free") as Plan;
    isAdmin =
      isAdminEmail(user.email ?? null) || Boolean(profile?.is_admin);
  }

  const allowed = isAdmin || canAccess(plan, "conviction");
  return { allowed };
}

async function getConvictionByIdeaSlug(slug: string, includeBody: boolean) {
  const selectBase =
    "id,status,created_at,published_at,ideas:idea_id!inner(slug,idea_no,ticker,kind,direction,option_side,created_at,published_at,summary,context)";

  const select = includeBody ? `${selectBase},body` : selectBase;

  const { data } = await supabaseAdmin
    .from("convictions")
    .select(select)
    .eq("status", "published")
    .eq("ideas.slug", slug)
    .maybeSingle();

  return (data ?? null) as ConvictionRow | null;
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  
const site = process.env.NEXT_PUBLIC_SITE_URL || "https://short-it.trade";
  const teaserUrl = `${site}/conviction/${slug}`;

  // metadata should be indexable; teaser content is safe for crawlers
  const row = await getConvictionByIdeaSlug(slug, false);
  if (!row?.ideas) return { title: "Conviction", robots: { index: false, follow: false } };

  const t = row.ideas.ticker ? row.ideas.ticker.toUpperCase() : "Conviction";
  const k = row.ideas.kind ? `• ${row.ideas.kind}` : "";
  const n = row.ideas.idea_no ? `• #${pad3(row.ideas.idea_no)}` : "";

  const title = `${t} Conviction ${k} ${n}`.replace(/\s+/g, " ").trim();
  const desc =
    row.ideas.summary ??
    row.ideas.context ??
    "Macro / conviction teaser — subscribe to unlock the full write-up.";

  return {
    title,
    description: desc,
    alternates: { canonical: `/conviction/${slug}` },
    openGraph: {
      title,
      description: desc,
      url: `/conviction/${slug}`,
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "SHORT-IT — Trade Intel" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: ["/og.png"],
    },
  };
}

export default async function ConvictionTeaserPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;

  const { allowed } = await getViewerAccess();
  const row = await getConvictionByIdeaSlug(slug, allowed);
  if (!row?.ideas) return notFound();

  const idea = row.ideas;
  const whenISO = (row.published_at ?? row.created_at) as any;

  const teaser =
    idea.summary ??
    idea.context ??
    "Subscribe to unlock the full conviction write-up.";

  const jsonLd = ideaJsonLd({
    ideaNo: idea.idea_no ?? null,
    ticker: idea.ticker ?? null,
    kind: idea.kind ?? "Conviction",
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
          <div className="level-fade text-xs tracking-[0.35em] text-white/40">LEVEL II</div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {idea.ticker ? idea.ticker.toUpperCase() : "Conviction"}{" "}
            <span className="text-white/30">•</span>{" "}
            <span className="text-white/80">{idea.kind ?? "Conviction"}</span>
          </h1>
          <div className="mt-2 text-sm text-white/60">
            IDEA #{pad3(idea.idea_no)} • {new Date(whenISO).toLocaleString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/conviction"
            className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
          >
            Back
          </Link>
          {!allowed ? (
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
        <div className="text-xs tracking-widest text-white/40">PREVIEW</div>
        <p className="mt-2 text-sm text-white/70 leading-relaxed">
          {teaser}
        </p>

        {!allowed ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="text-sm text-white/80">
              Conviction is a premium unlock. Subscribe to see the full write-up + ongoing updates.
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
                View Ideas
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="text-xs tracking-widest text-white/40">FULL</div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/80 leading-relaxed">
              {row.body ?? "—"}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
