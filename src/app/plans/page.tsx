import Link from "next/link";

export const runtime = "nodejs";

function PlanCard({
  title,
  price,
  bullets,
  cta,
  href,
  accent,
}: {
  title: string;
  price: string;
  bullets: string[];
  cta: string;
  href: string;
  accent?: "red" | "white";
}) {
  const ring =
    accent === "red"
      ? "border-red-500/30 bg-red-500/10"
      : "border-white/10 bg-white/5";

  return (
    <div className={`rounded-3xl border p-6 ${ring}`}>
      <div className="text-xs tracking-widest text-white/60">{title.toUpperCase()}</div>
      <div className="mt-3 text-3xl font-semibold">{price}</div>

      <ul className="mt-4 space-y-2 text-sm text-white/75">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-white/60">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className="mt-6 inline-flex w-full items-center justify-center rounded-2xl border border-white/15 bg-black/40 px-4 py-3 text-sm font-semibold text-white hover:bg-black/55 transition"
      >
        {cta}
      </Link>
    </div>
  );
}

export default function PlansPage() {
  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Plans</h1>
        <p className="mt-1 text-sm text-white/60">Choose your level.</p>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <PlanCard
          title="Ideas (Level I)"
          price="$79.99 / mo"
          bullets={[
            "Access to ideas feed",
            "4-card carousel previews",
            "Full idea thesis on open",
          ]}
          cta="Get Ideas"
          href="/subscribe?tier=ideas"
        />

        <PlanCard
          title="Conviction (Level II)"
          price="$199.99 / mo"
          bullets={[
            "Everything in Ideas",
            "Conviction sections unlocked",
            "Higher detail & follow-through",
          ]}
          cta="Get Conviction"
          href="/subscribe?tier=conviction"
        />

        <PlanCard
          title="Macro (Level III)"
          price="$399.99 / mo"
          bullets={[
            "Everything in Conviction",
            "Macro context unlocked",
            "Portfolio-level view & regimes",
          ]}
          cta="Get Macro"
          href="/subscribe?tier=macro"
          accent="red"
        />
      </div>

      <div className="mt-6 text-xs text-white/50">
        *Pricing shown is placeholder—your Stripe prices are the source of truth.
      </div>
    </main>
  );
}
