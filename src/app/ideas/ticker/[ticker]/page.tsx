import type { Metadata } from "next";
import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/server";

type Idea = {
  id: string;
  slug: string;
  created_at: string;
  published_at: string | null;
  status: string;
  locked: boolean;
  kind: string | null;
  ticker: string | null;
  direction: string | null;
  option_side: string | null;
  context: string | null;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { ticker: string } }): Promise<Metadata> {
  const t = params.ticker.toUpperCase();
  const title = `${t} Trade Ideas & Market Analysis — SHORT-IT`;
  const description = `Public ${t} trade ideas and market analysis. Educational use only.`;
  return {
    title,
    description,
    alternates: { canonical: `/ideas/ticker/${params.ticker}` },
    openGraph: { title, description, images: ["/og.png"] },
    twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
  };
}

export default async function TickerPage({ params }: { params: { ticker: string } }) {
  const t = params.ticker.toUpperCase();

  const { data } = await supabaseAdmin
    .from("ideas")
    .select("id,slug,created_at,published_at,status,locked,kind,ticker,direction,option_side,context")
    .eq("status", "published")
    .eq("locked", false)
    .ilike("ticker", t)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(50);

  const items = (data ?? []) as Idea[];

  return (
    <main className="mx-auto max-w-6xl px-6 py-12 text-white">
      <div className="max-w-2xl">
        <div className="text-xs tracking-[0.35em] text-white/40">SHORT-IT</div>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">
          {t} trade ideas<span className="text-red-500">.</span>
        </h1>
        <p className="mt-4 text-base text-white/60">
          Public ideas only. Educational use only.
        </p>
      </div>

      <div className="mt-10 grid gap-4">
        {items.map((i) => (
          <Link
            key={i.id}
            href={`/ideas/${i.slug}`}
            className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/20 hover:bg-white/10"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs tracking-widest text-white/50">{i.ticker}</div>
              <span className="rounded-full px-3 py-1 text-xs font-semibold bg-white/10 text-white/80">
                {(i.direction ?? i.option_side ?? "—").toUpperCase()}
              </span>
            </div>

            <div className="mt-3 text-lg font-semibold leading-snug">
              {(i.kind ?? "Idea")} • {i.ticker}
            </div>

            {i.context ? (
              <p className="mt-2 text-sm text-white/70 line-clamp-2">{i.context}</p>
            ) : null}

            <div className="mt-4 text-xs text-white/40">
              {new Date(i.published_at ?? i.created_at).toLocaleString()}
            </div>
          </Link>
        ))}

        {items.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
            No public ideas for {t} yet.
          </div>
        ) : null}
      </div>
    </main>
  );
}
