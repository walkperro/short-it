"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Tier = "ideas" | "conviction" | "macro";

export default function AgreePage() {
  const [tier, setTier] = useState<Tier>("ideas");
  const [agreement, setAgreement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
  const [c3, setC3] = useState(false);

  const showRefund = useMemo(() => {
    const b = String(agreement?.body ?? "").toLowerCase();
    return (
      b.includes("refund") || b.includes("cancellation") || b.includes("cancel")
    );
  }, [agreement]);

  const allChecked = useMemo(
    () => c1 && c2 && (showRefund ? c3 : true),
    [c1, c2, c3, showRefund],
  );

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tier");
    if (t === "ideas" || t === "conviction" || t === "macro") setTier(t);

    (async () => {
      try {
        setErr(null);
        const res = await fetch("/api/agreements/active", {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Failed to load agreement");
        setAgreement(json.agreement);
      } catch (e: any) {
        setErr(e?.message ?? "Failed to load agreement");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function acceptAndCheckout() {
    try {
      setErr(null);

      if (!agreement?.version) throw new Error("Missing agreement version");

      const a = await fetch("/api/agreements/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version: agreement.version }),
      });
      const aj = await a.json().catch(() => ({}));
      if (!a.ok) throw new Error(aj?.error ?? "Failed to record acceptance");

      // optional: keep profile state fresh
      try {
        await fetch("/api/billing/sync", { method: "POST" });
      } catch {
        // ignore
      }

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Checkout failed");
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    }
  }

  return (
    <main className="mx-auto max-w-3xl p-6 text-white">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs tracking-[0.35em] text-white/40">
            AGREEMENT
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Before you purchase
          </h1>
          <p className="mt-2 text-sm text-white/60">
            You must accept the terms to continue to checkout.
          </p>
        </div>

        <Link
          href="/subscribe"
          className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 transition"
        >
          Back
        </Link>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
        {loading ? (
          <div className="text-sm text-white/70">Loading...</div>
        ) : err ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {err}
          </div>
        ) : (
          <>
            <div className="text-xs tracking-widest text-white/50">PLAN</div>
            <div className="mt-2 text-lg font-semibold capitalize">{tier}</div>

            <div className="mt-6 text-xs tracking-widest text-white/50">
              {agreement?.title ?? "Terms"}
            </div>

            <div className="mt-3 max-h-[40vh] overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/75 leading-relaxed">
              {agreement?.body ?? ""}
            </div>

            <div className="mt-6 space-y-3">
              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={c1}
                  onChange={(e) => setC1(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I agree to the Terms of Service and understand this is
                  educational content.
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-white/80">
                <input
                  type="checkbox"
                  checked={c2}
                  onChange={(e) => setC2(e.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>
                  I understand trading involves risk and I’m responsible for my
                  own decisions.
                </span>
              </label>

              {showRefund ? (
                <label className="flex items-start gap-3 text-sm text-white/80">
                  <input
                    type="checkbox"
                    checked={c3}
                    onChange={(e) => setC3(e.target.checked)}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    I agree to the refund/cancellation policy as described in
                    the agreement.
                  </span>
                </label>
              ) : null}
            </div>

            <button
              disabled={!allChecked || loading}
              onClick={acceptAndCheckout}
              className={[
                "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                allChecked
                  ? "bg-white text-black hover:opacity-95"
                  : "border border-white/10 bg-white/5 text-white/50",
                "disabled:opacity-60",
              ].join(" ")}
            >
              Continue to checkout
            </button>

            <div className="mt-3 text-xs text-white/40">
              Agreement version: {agreement?.version ?? "—"}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
