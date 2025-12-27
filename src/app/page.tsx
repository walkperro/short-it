import Link from "next/link";

function TierCard({
  title,
  price,
  bullets,
}: {
  title: string;
  price: string;
  bullets: string[];
}) {
  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.22em] text-white/50">TIER</div>
          <div className="mt-2 text-xl font-semibold">{title}</div>
          <div className="mt-1 text-white/60">{price}</div>
        </div>
        <div className="h-10 w-10 rounded-2xl border border-white/10 bg-black/30" />
      </div>

      <ul className="mt-5 list-disc space-y-2 pl-5 text-white/70">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>

      <div className="mt-6">
        <Link
          href="/subscribe"
          className="micro-press inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:brightness-95"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="pt-6">
        <div className="text-xs tracking-[0.25em] text-white/50">SHORT-IT</div>
        <h1 className="mt-3 text-5xl font-semibold tracking-tight">
          Trade ideas<span className="text-[#E10600]">.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-white/70">
          High-conviction setups with clean structure. Not financial advice.
        </p>

        <div className="mt-7 flex flex-wrap gap-3">
          <Link
            href="/ideas"
            className="micro-press inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:brightness-95"
          >
            View Ideas
          </Link>
          <Link
            href="/subscribe"
            className="micro-press inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
          >
            Subscribe
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-xs tracking-[0.22em] text-white/50">TIERS</div>
            <h2 className="mt-2 text-2xl font-semibold">Unlock more context</h2>
          </div>
          <Link className="text-sm text-white/60 underline underline-offset-4 hover:text-white" href="/subscribe">
            Compare
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <TierCard
            title="Ideas (Level I)"
            price="$29.99 / month"
            bullets={[
              "3–4 ideas per month",
              "Targets + timeframes",
              "Full thesis unlocked",
            ]}
          />
          <TierCard
            title="Conviction (Level II)"
            price="$79.99 / month"
            bullets={[
              "Technical + fundamental reasoning",
              "Positioning + key levels",
              "Unlocks Conviction section",
            ]}
          />
          <TierCard
            title="Macro (Level III)"
            price="$199.99 / month"
            bullets={[
              "Regime view: rates, spreads, credit",
              "Risk-on/off + drivers",
              "Unlocks Macro context",
            ]}
          />
        </div>
      </section>
    </div>
  );
}
