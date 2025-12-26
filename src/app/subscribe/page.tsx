"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseAuth } from "@/lib/supabase/auth-client";

type Tier = "ideas" | "conviction" | "macro";
type Plan = "free" | Tier;

function planRank(plan: Plan) {
  if (plan === "macro") return 3;
  if (plan === "conviction") return 2;
  if (plan === "ideas") return 1;
  return 0;
}

export default function SubscribePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState<Tier | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    // session (client)
    const { data } = await supabaseAuth.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    setUserId(uid);

    // server-truth plan (cookie auth)
    const res = await fetch("/api/me", { cache: "no-store" }).catch(() => null);
    const json = res ? await res.json().catch(() => ({})) : {};
    setPlan((json?.plan as Plan) ?? "free");
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supabaseAuth.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function checkout(tier: Tier) {
    setError(null);

    if (!userId) {
      setError("Please log in first.");
      return;
    }

    setLoading(tier);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, userId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Checkout failed (${res.status})`);

      if (json?.url) window.location.href = json.url;
      else throw new Error("Checkout did not return a redirect URL.");
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed.");
    } finally {
      setLoading(null);
    }
  }

  async function manageBilling() {
    setError(null);

    if (!userId) {
      setError("Please log in first.");
      return;
    }

    setBillingBusy(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? `Portal failed (${res.status})`);

      if (json?.url) window.location.href = json.url;
      else throw new Error("Portal did not return a URL.");
    } catch (e: any) {
      setError(e?.message ?? "Billing portal failed.");
    } finally {
      setBillingBusy(false);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Subscribe</h1>
          <p className="mt-2 text-sm text-white/60">
            Start with Ideas. Upgrade for Conviction + Macro context.
          </p>
          <div className="mt-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
            Current plan: <span className="ml-2 text-white">{plan}</span>
          </div>
        </div>

        {userId ? (
          <button
            onClick={manageBilling}
            disabled={billingBusy}
            className="rounded-2xl border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-60"
          >
            {billingBusy ? "Opening…" : "Manage billing"}
          </button>
        ) : (
          <Link
            href="/login?next=/subscribe"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-black"
          >
            Log in
          </Link>
        )}
      </div>

      {!userId && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
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

      <div className="mt-6 grid gap-4">
        <Card
          title="Ideas (LEVEL I)"
          price="$29.99 / month"
          desc="3–4 ideas/month. Targets + timeframes."
          cta={plan === "ideas" ? "Current" : planRank(plan) > 1 ? "Included" : "Choose"}
          disabled={plan === "ideas" || planRank(plan) > 1}
          onClick={() => checkout("ideas")}
          loading={loading === "ideas"}
        />

        <Card
          title="Conviction (LEVEL II)"
          price="$79.99 / month"
          desc="Unlock technical + fundamental thesis for each idea."
          cta={plan === "conviction" ? "Current" : plan === "macro" ? "Included" : "Choose"}
          disabled={plan === "conviction" || plan === "macro"}
          onClick={() => checkout("conviction")}
          loading={loading === "conviction"}
        />

        <Card
          title="Macro (LEVEL III)"
          price="$199.99 / month"
          desc="Sector + rates + spreads + regime view behind allocation."
          cta={plan === "macro" ? "Current" : "Choose"}
          disabled={plan === "macro"}
          onClick={() => checkout("macro")}
          loading={loading === "macro"}
        />
      </div>

      <div className="mt-6 text-xs text-white/50">
        Subscriptions are billed monthly. Cancel anytime in the billing portal.
      </div>
    </main>
  );
}

function Card({
  title,
  price,
  desc,
  cta,
  disabled,
  onClick,
  loading,
}: {
  title: string;
  price: string;
  desc: string;
  cta: string;
  disabled: boolean;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-white/60">{price}</div>
      </div>
      <div className="mt-2 text-sm text-white/70">{desc}</div>

      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="mt-4 rounded-full bg-white text-black px-4 py-2 text-sm disabled:opacity-60"
      >
        {loading ? "Redirecting…" : cta}
      </button>
    </div>
  );
}
