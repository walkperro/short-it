"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import LockIcon from "@/components/LockIcon";

type Tier = "free" | "ideas" | "conviction" | "macro" | "admin";

const AGREEMENTS_VERSION =
  process.env.NEXT_PUBLIC_AGREEMENTS_VERSION || "2026-01-18";

const TIER_META: Record<
  Tier,
  { title: string; price: string; img: string; rank: number }
> = {
  free: { title: "Free", price: "$0", img: "/tiers/ideas.png", rank: 0 }, // only used for rank math
  ideas: {
    title: "Ideas (LEVEL I)",
    price: "$29.99 / month",
    img: "/tiers/ideas.png",
    rank: 1,
  },
  conviction: {
    title: "Conviction (LEVEL II)",
    price: "$79.99 / month",
    img: "/tiers/conviction.png",
    rank: 2,
  },
  macro: {
    title: "Macro (LEVEL III)",
    price: "$199.99 / month",
    img: "/tiers/macro.png",
    rank: 3,
  },
  // IMPORTANT: admin is NOT a paid plan; do not grant access by rank
  admin: { title: "Admin", price: "$0", img: "/tiers/ideas.png", rank: 0 },
};

function rankOf(plan: Tier) {
  return plan === "admin" ? 0 : TIER_META[plan].rank;
}

export default function SubscribePage() {
  const [plan, setPlan] = useState<Tier>("free");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [acceptedOk, setAcceptedOk] = useState(false);

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
        await syncPlan();
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

  async function acceptAgreements() {
    setErr(null);
    setAccepting(true);
    try {
      // Always accept the currently active agreement version
      const a = await fetch("/api/agreements/active", { cache: "no-store" });
      const aj = await a.json().catch(() => ({}));
      const activeVersion = aj?.agreement?.version ?? null;

      const res = await fetch("/api/agreements/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activeVersion ? { version: activeVersion } : {}),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error ?? "Failed to accept agreements");
      setAgreed(true);
      setAcceptedOk(true);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to accept agreements.");
    } finally {
      setAccepting(false);
    }
  }

  async function openPortal() {
    setErr(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error ?? "Failed to open billing portal");
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message ?? "Failed to open billing portal");
    }
  }

  async function checkout(tier: Exclude<Tier, "free" | "admin">) {
    setErr(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Agreement gate: send user to accept page, then bring them back
        if (json?.code === "AGREEMENT_REQUIRED") {
          const next = `/subscribe`;
          window.location.href = `/subscribe/agree?tier=${encodeURIComponent(tier)}`;
          return;
        }
        throw new Error(json?.error ?? "Checkout failed");
      }
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message ?? "Checkout failed.");
    }
  }

  const currentRank = rankOf(plan);

  async function goTier(nextTier: Exclude<Tier, "free" | "admin">) {
    setErr(null);
    try {
      // New customers: use agreement screen + checkout
      if (plan === "free") {
        window.location.href = `/subscribe/agree?tier=${encodeURIComponent(nextTier)}`;
        return;
      }

      // Existing customers: switch in-app (single subscription)
      const res = await fetch("/api/stripe/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: nextTier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json?.code === "AGREEMENT_REQUIRED") {
          window.location.href = `/subscribe/agree?tier=${encodeURIComponent(nextTier)}`;
          return;
        }
        throw new Error(json?.error ?? "Switch failed");
      }

      // refresh plan UI
      await syncPlan();
      const m = await fetch("/api/me/plan", { cache: "no-store" });
      const mj = await m.json().catch(() => ({}));
      if (mj?.plan) setPlan(mj.plan);
    } catch (e: any) {
      setErr(e?.message ?? "Switch failed");
    }
  }

  function isIncluded(tier: Exclude<Tier, "free" | "admin">) {
    return TIER_META[tier].rank <= currentRank;
  }

  function isSelected(tier: Exclude<Tier, "free" | "admin">) {
    return TIER_META[tier].rank === currentRank && currentRank > 0;
  }

  function isLockedTier(tier: Exclude<Tier, "free" | "admin">) {
    return TIER_META[tier].rank > currentRank;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 text-white">
      <h1 className="text-4xl font-semibold tracking-tight">Plans</h1>
      <p className="mt-2 text-sm text-white/60">
        Start with Ideas. Upgrade for Conviction + Macro context.
      </p>
      {/* AGREEMENTS GATE */}
      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm font-semibold">Before purchase</div>
        <p className="mt-2 text-sm text-white/60">
          You must accept the Terms + Disclaimer to subscribe.
        </p>

        <label className="mt-4 flex items-start gap-3 text-sm text-white/80">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 h-4 w-4"
          />
          <span>
            I agree to the{" "}
            <Link
              href="/info?tab=legal"
              className="underline underline-offset-4 hover:text-white"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/info?tab=legal"
              className="underline underline-offset-4 hover:text-white"
            >
              Disclaimer
            </Link>
            .
          </span>
        </label>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={acceptAgreements}
            disabled={!agreed || accepting || acceptedOk}
            className={[
              "rounded-2xl px-4 py-2 text-sm font-semibold transition",
              !agreed || accepting
                ? "border border-white/10 bg-white/5 text-white/50"
                : "bg-white text-black hover:opacity-95",
            ].join(" ")}
          >
            {accepting
              ? "Saving..."
              : acceptedOk
                ? "Accepted ✓"
                : "Accept & Continue"}
          </button>

          <Link
            href="/account"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Back to account
          </Link>
        </div>

        {!agreed ? (
          <div className="mt-3 text-xs text-white/50">
            Subscription buttons will unlock after you accept.
          </div>
        ) : null}
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-xs tracking-widest text-white/50">
          CURRENT PLAN
        </div>
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
                  const res = await fetch("/api/me/plan", {
                    cache: "no-store",
                  });
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

      {/* Desktop goes horizontal */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        <TierCard
          title={TIER_META.ideas.title}
          price={TIER_META.ideas.price}
          img={TIER_META.ideas.img}
          selected={isSelected("ideas")}
          included={isIncluded("ideas")}
          locked={isLockedTier("ideas")}
          disabled={loading || !agreed}
          onClick={() => goTier("ideas")}
        />

        <TierCard
          title={TIER_META.conviction.title}
          price={TIER_META.conviction.price}
          img={TIER_META.conviction.img}
          selected={isSelected("conviction")}
          included={isIncluded("conviction")}
          locked={isLockedTier("conviction")}
          disabled={loading || !agreed}
          onClick={() => goTier("conviction")}
        />

        <TierCard
          title={TIER_META.macro.title}
          price={TIER_META.macro.price}
          img={TIER_META.macro.img}
          selected={isSelected("macro")}
          included={isIncluded("macro")}
          locked={isLockedTier("macro")}
          disabled={loading || !agreed}
          onClick={() => goTier("macro")}
        />
      </div>
    </main>
  );
}

function TierCard({
  title,
  price,
  img,
  onClick,
  disabled,
  selected,
  included,
  locked,
}: {
  title: string;
  price: string;
  img: string;
  onClick: () => void;
  disabled?: boolean;
  selected?: boolean;
  included?: boolean;
  locked?: boolean;
}) {
  const buttonText = `Unlock ${title.replace(/\s*\(.*?\)\s*/g, "").trim()}`;

  return (
    <div
      className={[
        "rounded-3xl border bg-white/5 p-6 transition",
        selected ? "border-white/30 ring-1 ring-white/20" : "border-white/10",
        "hover:border-white/20",
      ].join(" ")}
    >
      {/* Image area: full, not cropped */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        <Image
          src={img}
          alt={title}
          width={1200}
          height={675}
          className="w-full h-auto object-contain"
          priority={false}
        />
        {/* locked overlay (only for tiers ABOVE current plan) */}
        {locked ? (
          <div className="absolute inset-0 grid place-items-center bg-black/55">
            <div className="flex flex-col items-center gap-2">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-black/40 text-white/70">
                <LockIcon className="h-6 w-6 text-white/70" />
              </div>
              <div className="text-xs tracking-widest text-white/60">
                LOCKED
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          <div className="mt-1 text-sm text-white/60">{price}</div>
        </div>

        {selected ? (
          <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
            Selected
          </span>
        ) : null}
      </div>

      {/* Button rules:
          - included (current plan or below): disabled + "Already included"
          - locked (above): show Unlock button
      */}
      <button
        disabled={disabled || included}
        onClick={onClick}
        className={[
          "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
          included
            ? "border border-white/10 bg-white/5 text-white/50"
            : "bg-white text-black hover:opacity-95",
          "disabled:opacity-60",
        ].join(" ")}
      >
        {included ? "Already included in your plan" : buttonText}
      </button>
    </div>
  );
}
