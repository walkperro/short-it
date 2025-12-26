"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseAuth } from "@/lib/supabase/auth-client";

type Tier = "ideas" | "conviction" | "macro";

export default function SubscribePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<Tier | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseAuth.auth.getSession();
      setUserId(data.session?.user?.id ?? null);
    })();
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

      if (!res.ok) {
        throw new Error(json?.error ?? `Checkout failed (${res.status})`);
      }

      if (json?.url) window.location.href = json.url;
      else throw new Error("Checkout did not return a redirect URL.");
    } catch (e: any) {
      setError(e?.message ?? "Checkout failed.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-white">Subscribe</h1>
      <p className="mt-2 text-sm text-white/60">
        Start with Ideas. Upgrade for Conviction + Macro context.
      </p>

      {!userId && (
        <div className="mt-4 rounded-2xl border border-white/10 p-4 text-sm text-white/70">
          You’re not logged in.{" "}
          <Link className="underline text-white" href="/login">
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
          onClick={() => checkout("ideas")}
          loading={loading === "ideas"}
        />
        <Card
          title="Conviction (LEVEL II)"
          price="$79.99 / month"
          desc="Unlock technical + fundamental thesis for each idea."
          onClick={() => checkout("conviction")}
          loading={loading === "conviction"}
        />
        <Card
          title="Macro (LEVEL III)"
          price="$199.99 / month"
          desc="Sector + rates + spreads + regime view behind allocation."
          onClick={() => checkout("macro")}
          loading={loading === "macro"}
        />
      </div>
    </main>
  );
}

function Card({
  title,
  price,
  desc,
  onClick,
  loading,
}: {
  title: string;
  price: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 p-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-white">{title}</div>
        <div className="text-sm text-white/60">{price}</div>
      </div>
      <div className="mt-2 text-sm text-white/70">{desc}</div>
      <button
        onClick={onClick}
        disabled={loading}
        className="mt-4 rounded-full bg-white text-black px-4 py-2 text-sm disabled:opacity-60"
      >
        {loading ? "Redirecting…" : "Choose"}
      </button>
    </div>
  );
}
