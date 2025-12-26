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
  summary: string;
  created_at: string;

  // returned only when allowed
  plan?: Plan;
  conviction?: string | null;
  macro_context?: string | null;
};

function planLabel(plan: Plan) {
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
  const hasConviction = !!data.conviction;
  const hasMacro = !!data.macro_context;

  return (
    <main className="p-6 max-w-3xl mx-auto text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <div className="text-sm text-white/70 mt-1">
            {data.ticker} · {data.direction.toUpperCase()} · Target {data.target_price}
          </div>
          <div className="mt-2 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            {planLabel(plan)}
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
        <h2 className="font-medium">Summary</h2>
        <p className="mt-2 text-sm text-white/80">{data.summary}</p>
      </section>

      {/* Conviction */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Conviction</h3>
          {!hasConviction ? (
            <span className="text-xs text-white/60">Locked · LEVEL II+</span>
          ) : (
            <span className="text-xs text-white/60">Unlocked</span>
          )}
        </div>

        {hasConviction ? (
          <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{data.conviction}</p>
        ) : (
          <div className="mt-2 text-sm text-white/70">
            Upgrade to <span className="text-white">Conviction</span> to see the technical + fundamental thesis.
            <div className="mt-3">
              <a
                href="/subscribe"
                className="inline-flex rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Unlock Conviction
              </a>
            </div>
          </div>
        )}
      </section>

      {/* Macro */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-medium">Macro</h3>
          {!hasMacro ? (
            <span className="text-xs text-white/60">Locked · LEVEL III</span>
          ) : (
            <span className="text-xs text-white/60">Unlocked</span>
          )}
        </div>

        {hasMacro ? (
          <p className="mt-2 text-sm text-white/80 whitespace-pre-wrap">{data.macro_context}</p>
        ) : (
          <div className="mt-2 text-sm text-white/70">
            Upgrade to <span className="text-white">Macro</span> to see the regime view (rates, spreads, flows, geopolitics).
            <div className="mt-3">
              <a
                href="/subscribe"
                className="inline-flex rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
              >
                Unlock Macro
              </a>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
