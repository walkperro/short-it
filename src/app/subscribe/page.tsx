"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tier = "free" | "ideas" | "conviction" | "macro" | "admin";

export default function SubscribePage() {
  const [plan, setPlan] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function syncPlan() {
    try {
      await fetch("/api/billing/sync", { method: "POST" });
    } catch {
      // ignore; we still attempt /api/me/plan
    }
  }

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        // ✅ restore purchases first
        await syncPlan();

        // ✅ then read plan from DB-backed endpoint
        const res = await fetch("/api/me/plan", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) throw new Error(json?.error ?? "Failed to load plan");
        if (json?.plan) setPlan(json.plan as Tier);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to check plan.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function checkout(tier: Exclude<Tier, "free" | "admin">) {
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }), // ✅ stripe/checkout expects { tier }
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Checkout failed");
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-white">
      <h1 className="text-4xl font-semibold tracking-tight">Plans</h1>
      <p className="mt-2 text-sm text-white/60">
        Start with Ideas. Upgrade for Conviction + Macro context.
      </p>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs tracking-widest text-white/50">CURRENT PLAN</div>
        <div className="mt-2 text-2xl font-semibold">
          {loading ? "Checking..." : plan}
        </div>

        {err ? (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        <div className="mt-5 flex gap-3">
          <Link
            href="/account"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Back to account
          </Link>
          <button
            onClick={() => {
              setLoading(true);
              (async () => {
                try {
                  await syncPlan();
                  const res = await fetch("/api/me/plan", { cache: "no-store" });
                  const json = await res.json().catch(() => ({}));
                  if (json?.plan) setPlan(json.plan);
                } finally {
                  setLoading(false);
                }
              })();
            }}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-8 grid gap-4">
        <TierCard
          title="Ideas (LEVEL I)"
          price="$29.99 / month"
          disabled={loading}
          onClick={() => checkout("ideas")}
        />
        <TierCard
          title="Conviction (LEVEL II)"
          price="$59.99 / month"
          disabled={loading}
          onClick={() => checkout("conviction")}
        />
        <TierCard
          title="Macro (LEVEL III)"
          price="$99.99 / month"
          disabled={loading}
          onClick={() => checkout("macro")}
        />
      </div>
    </main>
  );
}

function TierCard({
  title,
  price,
  onClick,
  disabled,
}: {
  title: string;
  price: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-1 text-sm text-white/60">{price}</div>
      <button
        disabled={disabled}
        onClick={onClick}
        className="mt-5 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
      >
        Choose plan
      </button>
    </div>
  );
}
