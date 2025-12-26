import { notFound } from "next/navigation";
import { getRequestBaseUrl } from "@/lib/server-url";

export const dynamic = "force-dynamic";

type Plan = "free" | "ideas" | "conviction" | "macro";

type Idea = {
  id: string;
  slug: string;
  title: string;
  ticker: string;
  direction: "long" | "short";
  start_date: string;
  end_date: string;
  target_price: number;

  teaser?: string | null;
  created_at: string;
  published_at?: string | null;

  plan?: Plan;
  summary?: string | null;        // LEVEL I+
  conviction?: string | null;     // LEVEL II+
  macro_context?: string | null;  // LEVEL III
};

function fmt(ts?: string | null) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString();
}

function label(plan: Plan) {
  if (plan === "macro") return "LEVEL III — MACRO";
  if (plan === "conviction") return "LEVEL II — CONVICTION";
  if (plan === "ideas") return "LEVEL I — IDEAS";
  return "FREE";
}

export default async function IdeaDetail({ params }: { params: { slug: string } }) {
  const baseUrl = getRequestBaseUrl();
  const res = await fetch(`${baseUrl}/api/ideas/${params.slug}`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));

  if (!res.ok || !json.data) return notFound();

  const data: Idea = json.data;
  const plan: Plan = (data.plan as Plan) ?? "free";

  const posted = data.published_at ?? data.created_at;

  return (
    <main className="p-6 max-w-3xl mx-auto text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <div className="text-sm text-white/70 mt-1">
            {data.ticker} · {data.direction.toUpperCase()} · Target {data.target_price}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              {label(plan)}
            </span>
            <span className="text-xs text-white/50">Posted: {fmt(posted)}</span>
          </div>
        </div>

        <a
          href="/subscribe"
          className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 transition"
        >
          Upgrade
        </a>
      </div>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-medium">Teaser</h2>
        <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{data.teaser ?? "—"}</p>
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Idea Thesis</h3>
          <span className="text-xs text-white/60">{data.summary ? "Unlocked" : "Locked · LEVEL I+"}</span>
        </div>
        {data.summary ? (
          <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{data.summary}</p>
        ) : (
          <div className="mt-2 text-sm text-white/70">
            Subscribe to <span className="text-white">Ideas (LEVEL I)</span> to read the full thesis.
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Conviction</h3>
          <span className="text-xs text-white/60">{data.conviction ? "Unlocked" : "Locked · LEVEL II+"}</span>
        </div>
        {data.conviction ? (
          <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{data.conviction}</p>
        ) : (
          <div className="mt-2 text-sm text-white/70">
            Upgrade to <span className="text-white">Conviction</span> to see the technical + fundamental thesis.
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Macro</h3>
          <span className="text-xs text-white/60">{data.macro_context ? "Unlocked" : "Locked · LEVEL III"}</span>
        </div>
        {data.macro_context ? (
          <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{data.macro_context}</p>
        ) : (
          <div className="mt-2 text-sm text-white/70">
            Upgrade to <span className="text-white">Macro</span> for the full regime view.
          </div>
        )}
      </section>
    </main>
  );
}
