"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Tier = "ideas" | "conviction" | "macro";
type Plan = "free" | Tier;

function rank(plan: Plan) {
  if (plan === "macro") return 3;
  if (plan === "conviction") return 2;
  if (plan === "ideas") return 1;
  return 0;
}

export default function SubscribePage() {
  const [loading, setLoading] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [busyMe, setBusyMe] = useState(true);

  useEffect(() => {
    (async () => {
      setBusyMe(true);
      const res = await fetch("/api/me", { cache: "no-store" }).catch(() => null);
      const json = res ? await res.json().catch(() => ({})) : {};
      setUserEmail(json?.user?.email ?? null);
      setPlan((json?.plan as Plan) ?? "free");
      setBusyMe(false);
    })();
  }, []);

  async function checkout(tier: Tier) {
    setError(null);

    if (!userEmail) {
      setError("Please log in first.");
      return;
    }

    // Don't let them "buy" what they already have or a lower tier
    if (rank(plan) >= rank(tier)) {
      setError("You already have this plan (or higher).");
      return;
    }

    setLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Checkout failed (${res.status})`);
      if (!json?.url) throw new Error("Checkout did not return a redirect URL.");

      window.location.href = json.url;
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed.");
    } finally {
      setLoading(null);
    }
  }

  const planLabel = useMemo(() => {
    if (busyMe) return "Checking…";
    if (!userEmail) return "Not logged in";
    if (plan === "free") return "Free";
    if (plan === "ideas") return "LEVEL I — Ideas";
    if (plan === "conviction") return "LEVEL II — Conviction";
    return "LEVEL III — Macro";
  }, [busyMe, userEmail, plan]);

  return (
    <main className="mx-auto max-w-5xl p-6 text-white">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Subscribe</h1>
          <p className="mt-1 text-sm text-white/60">
            Start with Ideas. Upgrade for Conviction + Macro context.
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 card px-4 py-3 text-sm">
          <div className="text-white/60">Current plan</div>
          <div className="mt-1 font-medium">{planLabel}</div>
        </div>
      </div>

      {!userEmail && !busyMe && (
        <div className="mt-4 rounded-2xl border border-white/10 card p-4 text-sm text-white/70">
          You’re not logged in.{" "}
          <Link className="underline text-white" href="/login?next=/subscribe">
            Log in
          </Link>{" "}
          to subscribe.
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <TierCard
          title="Ideas (LEVEL I)"
          price="$29.99 / month"
          img="/tiers/ideas.png"
          bullets={[
            "3–4 ideas per month",
            "Targets + timeframes",
            "Full thesis unlocked (LEVEL I)",
          ]}
          tag={rank(plan) === 1 ? "Current plan" : rank(plan) > 1 ? "Included" : null}
          disabled={!userEmail || loading !== null || rank(plan) >= 1}
          onClick={() => checkout("ideas")}
          loading={loading === "ideas"}
        />

        <TierCard
          title="Conviction (LEVEL II)"
          price="$79.99 / month"
          img="/tiers/conviction.png"
          bullets={[
            "Technical + fundamental reasoning",
            "Positioning + key levels (thesis)",
            "Unlocks Conviction section on each idea",
          ]}
          tag={rank(plan) === 2 ? "Current plan" : rank(plan) > 2 ? "Included" : null}
          disabled={!userEmail || loading !== null || rank(plan) >= 2}
          onClick={() => checkout("conviction")}
          loading={loading === "conviction"}
        />

        <TierCard
          title="Macro (LEVEL III)"
          price="$199.99 / month"
          img="/tiers/macro.png"
          bullets={[
            "Regime view: rates, spreads, credit",
            "Sector allocation rationale",
            "Unlocks Macro section on each idea",
          ]}
          tag={rank(plan) === 3 ? "Current plan" : null}
          disabled={!userEmail || loading !== null || rank(plan) >= 3}
          onClick={() => checkout("macro")}
          loading={loading === "macro"}
        />
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 card p-6">
        <h2 className="text-lg font-semibold">What you’re buying</h2>
        <p className="mt-2 text-sm text-white/70">
          LEVEL I gives you the actionable thesis. LEVEL II explains the conviction. LEVEL III adds macro regime context.
        </p>
        <p className="mt-4 text-xs text-white/50">
          Not investment advice. Educational content only.
        </p>
      </div>
    </main>
  );
}

function TierCard({
  title,
  price,
  img,
  bullets,
  tag,
  onClick,
  loading,
  disabled,
}: {
  title: string;
  price: string;
  img: string;
  bullets: string[];
  tag: string | null;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/60">{price}</div>
        </div>
        {tag ? (
          <span className="rounded-full border border-white/10 card px-3 py-1 text-xs text-white/70">
            {tag}
          </span>
        ) : null}
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
        {/* plain img so no extra config needed */}
        <img src={img} alt={title} className="h-44 w-full object-cover" />
      </div>

      <ul className="mt-4 space-y-2 text-sm text-white/75">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-[2px] inline-block h-2 w-2 rounded-full bg-white/60" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        disabled={disabled}
        className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
      >
        {loading ? "Redirecting…" : disabled ? "Selected" : "Choose"}
      </button>
    </div>
  );
}
