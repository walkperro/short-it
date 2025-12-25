export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="text-xs tracking-widest uppercase text-black/60">
          Short-It
        </div>

        <h1 className="mt-3 text-4xl font-semibold leading-tight">
          Trade Ideas. <span className="text-black/60">Then the conviction.</span>
        </h1>

        <p className="mt-4 text-base text-black/70">
          Start with 3–4 ideas per month. Upgrade to unlock thesis and macro regime
          context behind each recommendation.
        </p>

        <div className="mt-8 flex gap-3">
          <a
            href="/ideas"
            className="rounded-2xl border px-5 py-3 text-sm hover:shadow-sm transition"
          >
            View Ideas
          </a>

          <a
            href="/subscribe"
            className="rounded-2xl bg-black text-white px-5 py-3 text-sm hover:opacity-90 transition"
          >
            Subscribe
          </a>
        </div>

        <div className="mt-10 grid gap-3 rounded-2xl border p-5">
          <div className="text-sm font-medium">Tiers</div>
          <ul className="text-sm text-black/70 space-y-1">
            <li><span className="font-medium text-black">Tier 1:</span> Ideas (what + target + timeframe)</li>
            <li><span className="font-medium text-black">Tier 2:</span> Conviction (technicals + fundamentals)</li>
            <li><span className="font-medium text-black">Tier 3:</span> Macro (sector + rates + spreads + regime)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

/* --- Pricing context --- */
{/* 
<div className="mt-10 grid gap-3 rounded-2xl border p-5">
  <div className="text-sm font-medium">Access Levels</div>
  <ul className="text-sm text-black/70 space-y-1">
    <li><strong>LEVEL I — Ideas:</strong> What to trade.</li>
    <li><strong>LEVEL II — Conviction:</strong> Why it should work.</li>
    <li><strong>LEVEL III — Macro:</strong> Why now, and why this sector.</li>
  </ul>
</div>
*/}
