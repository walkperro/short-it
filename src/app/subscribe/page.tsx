"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

type Tier = "ideas" | "conviction" | "macro";

export default function SubscribePage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<Tier | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseAuth.auth.getSession();
      setUserId(data.session?.user?.id ?? null);
    })();
  }, []);

  async function checkout(tier: Tier) {
    if (!userId) {
      window.location.href = "/account";
      return;
    }

    setLoading(tier);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier, userId }),
    });

    const json = await res.json().catch(() => ({}));
    setLoading(null);

    if (json?.url) window.location.href = json.url;
    else alert(json?.error ?? "Checkout failed");
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Subscribe</h1>
      <p className="mt-2 text-sm text-black/70">
        Start with Ideas. Upgrade later for Conviction and Macro.
      </p>

      <div className="mt-6 grid gap-4">
        <Card
          title="Ideas (LEVEL I)"
          price="$29.99 / month"
          desc="3–4 ideas/month. Targets + timeframes."
          onClick={() => checkout("ideas")}
          loading={loading === "ideas"}
        />

        <div className="opacity-60">
          <Card
            title="Conviction (LEVEL II)"
            price="$79.99 / month"
            desc="Technical + fundamental thesis behind each idea."
            onClick={() => checkout("conviction")}
            loading={loading === "conviction"}
            disabled
          />
          <Card
            title="Macro (LEVEL III)"
            price="$199.99 / month"
            desc="Regime view: rates, spreads, sector context."
            onClick={() => checkout("macro")}
            loading={loading === "macro"}
            disabled
          />
        </div>
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
  disabled,
}: {
  title: string;
  price: string;
  desc: string;
  onClick: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-black/60">{price}</div>
      </div>
      <div className="mt-2 text-sm text-black/70">{desc}</div>
      <button
        onClick={onClick}
        disabled={loading || disabled}
        className="mt-4 rounded-2xl bg-black text-white px-4 py-2 text-sm disabled:opacity-60"
      >
        {disabled ? "Coming next" : loading ? "Redirecting..." : "Subscribe"}
      </button>
    </div>
  );
}
