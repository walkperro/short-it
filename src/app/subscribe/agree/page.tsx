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

  // Password confirm state
  const [pw, setPw] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

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

  async function confirmPassword() {
    setPwErr(null);
    setPwOk(false);
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/confirm-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Incorrect password");
      setPwOk(true);
    } catch (e: any) {
      setPwOk(false);
      setPwErr(e?.message ?? "Incorrect password");
    } finally {
      setPwLoading(false);
    }
  }

  async function acceptAndCheckout() {
    setErr(null);

    try {
      if (!agreement?.version) throw new Error("Missing agreement version");
      if (!allChecked) throw new Error("Please check all required boxes.");
      if (!pwOk) {
        setPwErr("Please confirm your password to continue.");
        return;
      }

      setSubmitting(true);

      // record acceptance
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

      // proceed to checkout (or portal redirect / switch)

      // Grab GA client_id (best-effort)
      let ga_client_id: string | null = null;
      try {
        const w: any = typeof window !== "undefined" ? (window as any) : null;
        const gaId = process.env.NEXT_PUBLIC_GA_ID;
        if (w && typeof w.gtag === "function" && gaId) {
          await new Promise<void>((resolve) => {
            try {
              w.gtag("get", gaId, "client_id", (cid: any) => {
                ga_client_id = cid ? String(cid) : null;
                resolve();
              });
            } catch {
              resolve();
            }
            // safety timeout so we never hang the checkout
            setTimeout(resolve, 250);
          });
        }
      } catch {}

      // proceed to checkout (or portal redirect / switch)
      // GA intent event: start checkout (confirmed + agreements accepted)
      try {
        if (
          typeof window !== "undefined" &&
          typeof (window as any).gtag === "function"
        ) {
          (window as any).gtag("event", "start_checkout", {
            tier,
            source_page: "agree",
            page_path: window.location?.pathname || "/subscribe/agree",
          });
        }
      } catch {}
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, ga_client_id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Checkout failed");
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
    } finally {
      setSubmitting(false);
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
            You must accept the terms and confirm your password to continue.
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

            {/* Password confirm block */}
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs tracking-widest text-white/50">
                CONFIRM WITH PASSWORD
              </div>
              <p className="mt-2 text-xs text-white/55">
                Type your account password to confirm this purchase/plan change.
              </p>

              <div className="mt-3 flex gap-2">
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    setPwOk(false);
                    setPwErr(null);
                  }}
                  placeholder="Password"
                  className="w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/85 placeholder:text-white/35 outline-none focus:border-white/20"
                />
                <button
                  type="button"
                  onClick={confirmPassword}
                  disabled={!pw || pwLoading || submitting || loading}
                  className={[
                    "shrink-0 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                    !pw || pwLoading || submitting || loading
                      ? "border border-white/10 bg-white/5 text-white/50"
                      : "bg-white text-black hover:opacity-95",
                  ].join(" ")}
                >
                  {pwLoading ? "Checking…" : pwOk ? "Confirmed ✓" : "Confirm"}
                </button>
              </div>

              {pwErr ? (
                <div className="mt-3 text-xs text-red-200">{pwErr}</div>
              ) : null}
            </div>

            <button
              disabled={!allChecked || !pwOk || loading || submitting}
              onClick={acceptAndCheckout}
              className={[
                "mt-6 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                allChecked && pwOk
                  ? "bg-white text-black hover:opacity-95"
                  : "border border-white/10 bg-white/5 text-white/50",
                "disabled:opacity-60",
              ].join(" ")}
            >
              {submitting ? "Processing…" : "Continue to checkout"}
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
