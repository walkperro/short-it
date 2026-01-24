"use client";

import { useMemo, useState } from "react";

function getGaClientId() {
  if (typeof document === "undefined") return null;
  // GA cookie usually looks like: GA1.1.123456789.123456789
  const m = document.cookie.match(/(?:^|;\s*)_ga=([^;]+)/);
  if (!m) return null;
  const v = decodeURIComponent(m[1] || "");
  const parts = v.split(".");
  // return last two numeric parts (client id) if present, else raw cookie value
  if (parts.length >= 4)
    return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return v || null;
}

type Tier = "free" | "ideas" | "conviction" | "macro" | "admin";
type PaidTier = "ideas" | "conviction" | "macro";
type Step = "choose" | "confirm";

const LABEL: Record<PaidTier, string> = {
  ideas: "Ideas (LEVEL I)",
  conviction: "Conviction (LEVEL II)",
  macro: "Macro (LEVEL III)",
};

const PRICE_LINE: Record<PaidTier, string> = {
  ideas: "$29.99 / month",
  conviction: "$79.99 / month",
  macro: "$199.99 / month",
};

function rank(t: Tier) {
  if (t === "ideas") return 1;
  if (t === "conviction") return 2;
  if (t === "macro") return 3;
  return 0;
}

export default function SwitchPlanButton({
  currentPlan,
  isAdmin = false,
}: {
  currentPlan: Tier;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("choose");
  const [selected, setSelected] = useState<PaidTier | null>(null);
  const [downgradeTiming, setDowngradeTiming] = useState<"renewal" | "now">(
    "renewal",
  );

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Password confirm state
  const [pw, setPw] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const effectivePlan: Tier = isAdmin ? "macro" : currentPlan;

  const options = useMemo(() => {
    const all: PaidTier[] = ["ideas", "conviction", "macro"];
    return all.filter((t) => t !== effectivePlan);
  }, [effectivePlan]);

  const isDowngrade = useMemo(() => {
    if (!selected) return false;
    return rank(selected) < rank(effectivePlan);
  }, [selected, effectivePlan]);

  const isUpgrade = useMemo(() => {
    if (!selected) return false;
    return rank(selected) > rank(effectivePlan);
  }, [selected, effectivePlan]);

  const currentLabel =
    effectivePlan === "free"
      ? "Free"
      : effectivePlan === "ideas"
        ? LABEL.ideas
        : effectivePlan === "conviction"
          ? LABEL.conviction
          : LABEL.macro;

  const selectedLabel = selected ? LABEL[selected] : null;

  const confirmTitle = useMemo(() => {
    if (!selected) return "Confirm";
    if (isUpgrade) return "Confirm upgrade";
    if (isDowngrade) return "Confirm downgrade";
    return "Confirm switch";
  }, [selected, isUpgrade, isDowngrade]);

  const confirmBlurb = useMemo(() => {
    if (!selected) return "";
    if (isUpgrade) {
      return "You’ll be charged immediately by Stripe (prorated). Your access updates right away.";
    }
    if (isDowngrade) {
      return downgradeTiming === "now"
        ? "Your access will be reduced immediately. Stripe may apply a prorated credit depending on billing settings."
        : "Your access stays the same until the end of your current billing period, then the downgrade takes effect at renewal.";
    }
    return "Your plan will be updated.";
  }, [selected, isUpgrade, isDowngrade, downgradeTiming]);

  async function confirmPassword() {
    setPwErr(null);
    setPwOk(false);
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/confirm-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: pw,
          ga_client_id: getGaClientId() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(json?.error ?? "Password confirmation failed");
      setPwOk(true);
    } catch (e: any) {
      setPwOk(false);
      setPwErr(e?.message ?? "Incorrect password");
    } finally {
      setPwLoading(false);
    }
  }

  async function submit() {
    if (!selected) return;

    // Must confirm password for ALL switches
    if (!pwOk) {
      setPwErr("Please confirm your password to continue.");
      return;
    }

    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier: selected,
          downgrade_timing: isDowngrade ? downgradeTiming : "renewal",
          ga_client_id: getGaClientId() || undefined,
        }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to switch plan");

      if (json?.mode === "upgrade_now") {
        setMsg("Upgraded successfully. Stripe receipt should arrive by email.");
      } else if (json?.mode === "downgrade_now") {
        setMsg("Downgraded immediately.");
      } else if (json?.mode === "downgrade_at_renewal") {
        setMsg("Downgrade scheduled for renewal (you keep access until then).");
      } else {
        setMsg("Plan updated.");
      }

      setTimeout(() => {
        setOpen(false);
        window.location.href = "/account?sync=1";
      }, 700);
    } catch (e: any) {
      setErr(e?.message ?? "Failed");
      setStep("choose");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErr(null);
          setMsg(null);
          setSelected(null);
          setDowngradeTiming("renewal");
          setStep("choose");

          // reset pw confirm
          setPw("");
          setPwOk(false);
          setPwErr(null);
          setPwLoading(false);

          setOpen(true);
        }}
        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
      >
        Switch plan
      </button>

      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={() => (loading || pwLoading ? null : setOpen(false))}
          />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-white/10 bg-[#0b0b0c]/95 p-6 text-white shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs tracking-[0.35em] text-white/40">
                  SWITCH PLAN
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {step === "choose" ? "Choose your plan" : confirmTitle}
                </h2>
                <p className="mt-2 text-sm text-white/60">
                  {step === "choose"
                    ? "We’ll ask you to confirm before anything is charged or changed."
                    : confirmBlurb}
                </p>
              </div>

              <button
                type="button"
                onClick={() => (loading || pwLoading ? null : setOpen(false))}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs tracking-widest text-white/50">
                CURRENT
              </div>
              <div className="mt-1 text-sm font-semibold text-white/85">
                {currentLabel}
              </div>
            </div>

            {step === "choose" ? (
              <>
                <div className="mt-5 space-y-2">
                  <div className="text-xs tracking-widest text-white/50">
                    OPTIONS
                  </div>

                  {options.map((t) => (
                    <label
                      key={t}
                      className={[
                        "flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition",
                        selected === t
                          ? "border-white/25 bg-white/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10",
                      ].join(" ")}
                    >
                      <input
                        type="radio"
                        name="tier"
                        checked={selected === t}
                        onChange={() => setSelected(t)}
                        className="mt-1 h-4 w-4"
                      />
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="text-sm font-semibold">
                            {LABEL[t]}
                          </div>
                          <div className="text-xs text-white/55">
                            {PRICE_LINE[t]}
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-white/55">
                          {t === "ideas"
                            ? "Signals + simple structure."
                            : t === "conviction"
                              ? "Full write-ups + deeper context."
                              : "Macro perspective + top tier access."}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {selected && isDowngrade ? (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs tracking-widest text-white/50">
                      DOWNGRADE TIMING
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDowngradeTiming("renewal")}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs border transition",
                          downgradeTiming === "renewal"
                            ? "border-white/30 bg-white/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                        ].join(" ")}
                      >
                        At renewal (recommended)
                      </button>
                      <button
                        type="button"
                        onClick={() => setDowngradeTiming("now")}
                        className={[
                          "rounded-full px-3 py-1.5 text-xs border transition",
                          downgradeTiming === "now"
                            ? "border-white/30 bg-white/10 text-white"
                            : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
                        ].join(" ")}
                      >
                        Downgrade now
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-white/55">
                      “At renewal” keeps your current access until the billing
                      period ends.
                    </div>
                  </div>
                ) : null}

                {err ? (
                  <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {err}
                  </div>
                ) : null}

                <button
                  type="button"
                  disabled={!selected || loading}
                  onClick={() => {
                    if (!selected) return;
                    setErr(null);
                    setMsg(null);
                    setStep("confirm");
                    // reset pw confirm every time you enter confirm step
                    setPw("");
                    setPwOk(false);
                    setPwErr(null);
                    setPwLoading(false);
                  }}
                  className={[
                    "mt-5 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition",
                    !selected || loading
                      ? "border border-white/10 bg-white/5 text-white/50"
                      : "bg-white text-black hover:opacity-95",
                    "disabled:opacity-60",
                  ].join(" ")}
                >
                  {selected ? "Continue" : "Select a plan"}
                </button>

                <div className="mt-3 text-[11px] text-white/40">
                  You can also manage billing in the Stripe portal from “Manage
                  billing”.
                </div>
              </>
            ) : (
              <>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs tracking-widest text-white/50">
                    YOU ARE SWITCHING TO
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <div className="text-sm font-semibold text-white/90">
                      {selectedLabel ?? "—"}
                    </div>
                    {selected ? (
                      <div className="text-xs text-white/55">
                        {PRICE_LINE[selected]}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-3 text-xs text-white/60">
                    {isUpgrade ? (
                      <>
                        <span className="text-white/80 font-semibold">
                          Upgrade:
                        </span>{" "}
                        You’ll be charged immediately by Stripe (prorated).
                      </>
                    ) : isDowngrade ? (
                      downgradeTiming === "now" ? (
                        <>
                          <span className="text-white/80 font-semibold">
                            Downgrade now:
                          </span>{" "}
                          Access changes immediately.
                        </>
                      ) : (
                        <>
                          <span className="text-white/80 font-semibold">
                            Downgrade at renewal:
                          </span>{" "}
                          No immediate access change.
                        </>
                      )
                    ) : (
                      "Plan will update."
                    )}
                  </div>
                </div>

                {/* PASSWORD CONFIRM */}
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs tracking-widest text-white/50">
                    CONFIRM WITH PASSWORD
                  </div>
                  <p className="mt-2 text-xs text-white/55">
                    Type your account password to confirm this change.
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
                      disabled={!pw || pwLoading || loading}
                      className={[
                        "shrink-0 rounded-2xl px-3 py-2 text-sm font-semibold transition",
                        !pw || pwLoading || loading
                          ? "border border-white/10 bg-white/5 text-white/50"
                          : "bg-white text-black hover:opacity-95",
                      ].join(" ")}
                    >
                      {pwLoading
                        ? "Checking…"
                        : pwOk
                          ? "Confirmed ✓"
                          : "Confirm"}
                    </button>
                  </div>

                  {pwErr ? (
                    <div className="mt-3 text-xs text-red-200">{pwErr}</div>
                  ) : null}
                </div>

                {err ? (
                  <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                    {err}
                  </div>
                ) : null}

                {msg ? (
                  <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                    {msg}
                  </div>
                ) : null}

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={loading || pwLoading}
                    onClick={() => setStep("choose")}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10 disabled:opacity-60"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!selected || loading || pwLoading || !pwOk}
                    onClick={submit}
                    className={[
                      "rounded-2xl px-4 py-3 text-sm font-semibold transition",
                      !selected || loading || pwLoading || !pwOk
                        ? "border border-white/10 bg-white/5 text-white/50"
                        : "bg-white text-black hover:opacity-95",
                      "disabled:opacity-60",
                    ].join(" ")}
                  >
                    {loading ? "Confirming…" : "Confirm switch"}
                  </button>
                </div>

                <div className="mt-3 text-[11px] text-white/40">
                  This action is processed by Stripe.
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
