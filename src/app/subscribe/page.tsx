"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { normalizePlan, type Plan, levelLabelFromPlan } from "@/lib/entitlements";

type Tier = {
  key: Plan;
  title: string;
  price: string;
  points: string[];
  img: string; // public path
};

const TIERS: Tier[] = [
  {
    key: "ideas",
    title: `Ideas (${levelLabelFromPlan("ideas")})`,
    price: "$29.99 / month",
    points: ["3–4 ideas per month", "Targets + timeframes", `Full thesis unlocked (${levelLabelFromPlan("ideas")})`],
    img: "/tiers/ideas.png",
  },
  {
    key: "conviction",
    title: `Conviction (${levelLabelFromPlan("conviction")})`,
    price: "$79.99 / month",
    points: ["Includes Ideas", "Deeper reasoning + levels", `Unlock Conviction (${levelLabelFromPlan("conviction")})`],
    img: "/tiers/conviction.png",
  },
  {
    key: "macro",
    title: `Macro (${levelLabelFromPlan("macro")})`,
    price: "$149.99 / month",
    points: ["Includes Ideas + Conviction", "Macro context + framework", `Unlock Macro (${levelLabelFromPlan("macro")})`],
    img: "/tiers/macro.png",
  },
];

export default function SubscribePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [plan, setPlan] = useState<Plan>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/me/plan", { cache: "no-store" });
        const json = await res.json().catch(() => ({}));
        const p = normalizePlan(json?.plan);
        if (alive) setPlan(p as Plan);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function checkout(tier: Plan) {
    const { data } = await supabase.auth.getUser();
    if (!data?.user) {
      window.location.href = `/login?next=${encodeURIComponent("/subscribe")}`;
      return;
    }
    const res = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ plan: tier }),
    });
    const json = await res.json().catch(() => ({}));
    if (json?.url) window.location.href = json.url;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-white">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">Plans</h1>
        <p className="mt-2 text-white/60">Start with Ideas. Upgrade for Conviction + Macro context.</p>
      </div>

      <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
        <div className="text-xs tracking-widest text-white/50">CURRENT PLAN</div>
        <div className="mt-2 text-lg font-medium text-white">
          {loading ? "Checking…" : TIERS.find((t) => t.key === plan)?.title ?? (plan === "free" ? "Free" : String(plan))}
        </div>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {TIERS.map((t) => {
          const selected = plan === t.key;
          return (
            <div key={t.key} className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <div className="text-sm font-semibold">{t.title}</div>
              <div className="mt-1 text-white/60">{t.price}</div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <Image
                  src={t.img}
                  alt={t.title}
                  width={1200}
                  height={528}
                  sizes="(max-width: 768px) 92vw, 360px"
                  quality={75}
                  className="h-auto w-full"
                  priority={t.key === "ideas"}
                />
              </div>

              <ul className="mt-4 space-y-2 text-sm text-white/70">
                {t.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-white/40" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <button
                disabled={selected}
                onClick={() => checkout(t.key)}
                className={`mt-5 w-full rounded-2xl px-4 py-3 text-sm font-medium ${
                  selected ? "bg-white/40 text-black/70" : "bg-white text-black hover:bg-white/90"
                }`}
              >
                {selected ? "Selected" : "Choose plan"}
              </button>
            </div>
          );
        })}
      </div>
    </main>
  );
}
