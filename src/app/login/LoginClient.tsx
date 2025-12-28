"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";
import { useRouter, useSearchParams } from "next/navigation";

type Mode = "signin" | "signup";
type View = "form" | "pending";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function now() {
  return Date.now();
}

const PENDING_KEY = "shortit_pending_confirm_v1";
const PENDING_TTL_MS = 30 * 60 * 1000; // 30 minutes

function getOrigin() {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function pendingRead(): { email: string; ts: number } | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (!v?.email || !v?.ts) return null;
    if (now() - Number(v.ts) > PENDING_TTL_MS) {
      sessionStorage.removeItem(PENDING_KEY);
      return null;
    }
    return { email: String(v.email), ts: Number(v.ts) };
  } catch {
    return null;
  }
}

function pendingWrite(email: string) {
  try {
    sessionStorage.setItem(PENDING_KEY, JSON.stringify({ email, ts: now() }));
  } catch {}
}

function pendingClear() {
  try {
    sessionStorage.removeItem(PENDING_KEY);
  } catch {}
}

function throttleKey(email: string) {
  return `shortit_login_throttle_v1:${(email || "").toLowerCase()}`;
}

function throttleRead(email: string): { attempts: number; nextAllowedAt: number } {
  try {
    const raw = localStorage.getItem(throttleKey(email));
    if (!raw) return { attempts: 0, nextAllowedAt: 0 };
    const v = JSON.parse(raw);
    return {
      attempts: Number(v?.attempts || 0),
      nextAllowedAt: Number(v?.nextAllowedAt || 0),
    };
  } catch {
    return { attempts: 0, nextAllowedAt: 0 };
  }
}

function throttleWrite(email: string, attempts: number, nextAllowedAt: number) {
  try {
    localStorage.setItem(throttleKey(email), JSON.stringify({ attempts, nextAllowedAt }));
  } catch {}
}

function throttleClear(email: string) {
  try {
    localStorage.removeItem(throttleKey(email));
  } catch {}
}

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const [mode, setMode] = useState<Mode>("signin");
  const [view, setView] = useState<View>("form");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const [cooldownMs, setCooldownMs] = useState(0);
  const [resendCooldownMs, setResendCooldownMs] = useState(0);

  const origin = useMemo(() => getOrigin(), []);
  const emailRedirectTo = useMemo(() => {
    const o = origin || "";
    return o ? `${o}/auth/callback?next=/account` : undefined;
  }, [origin]);

  function prettySeconds(ms: number) {
    return Math.ceil(ms / 1000);
  }

  function backToForm() {
    pendingClear();
    setPendingEmail(null);
    setView("form");
    setMsg(null);
  }

  function showPending(emailAddr: string) {
    setPendingEmail(emailAddr);
    pendingWrite(emailAddr);
    setView("pending");
    setResendCooldownMs(30 * 1000);
    setMsg({ kind: "success", text: "Check your email for confirmation." });
  }

  // If already logged in, bounce to account.
  useEffect(() => {
    (async () => {
      const { data } = await supabaseAuth.auth.getSession();
      if (data?.session) {
        pendingClear();
        router.replace("/account");
        return;
      }

      const pending = pendingRead();
      if (pending?.email) {
        setPendingEmail(pending.email);
        setView("pending");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // show callback errors (optional)
  useEffect(() => {
    const err = sp?.get("error");
    if (err) setMsg({ kind: "error", text: err });
  }, [sp]);

  // Cooldown ticker
  useEffect(() => {
    if (cooldownMs <= 0 && resendCooldownMs <= 0) return;
    const t = setInterval(() => {
      setCooldownMs((v) => Math.max(0, v - 1000));
      setResendCooldownMs((v) => Math.max(0, v - 1000));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldownMs, resendCooldownMs]);

  async function handleSignin() {
    setMsg(null);

    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setMsg({ kind: "error", text: "Enter email + password." });
      return;
    }

    const t = throttleRead(e);
    const waitLeft = t.nextAllowedAt - now();
    if (waitLeft > 0) {
      setCooldownMs(waitLeft);
      setMsg({ kind: "error", text: `Too many attempts. Try again in ${prettySeconds(waitLeft)}s.` });
      return;
    }

    setBusy(true);
    const { error } = await supabaseAuth.auth.signInWithPassword({ email: e, password });
    setBusy(false);

    if (error) {
      const msg = (error.message || "").toLowerCase();

      // If they haven't confirmed, show the pending confirm screen instead of "wrong password" vibe
      if (msg.includes("confirm") || msg.includes("confirmed") || msg.includes("not confirmed")) {
        showPending(e);
        return;
      }

      const attempts = clamp(t.attempts + 1, 1, 10);
      const waitSeconds = clamp(5 * Math.pow(2, attempts - 1), 5, 300);
      const nextAllowedAt = now() + waitSeconds * 1000;

      throttleWrite(e, attempts, nextAllowedAt);
      setCooldownMs(waitSeconds * 1000);
      setMsg({ kind: "error", text: `Sign in failed. Try again in ${waitSeconds}s.` });
      return;
    }

    throttleClear(e);
    pendingClear();
    router.replace("/account");
  }

  async function handleSignup() {
    setMsg(null);

    const e = email.trim().toLowerCase();
    if (!e || !password) {
      setMsg({ kind: "error", text: "Enter email + password." });
      return;
    }

    setBusy(true);
    const { error } = await supabaseAuth.auth.signUp({
      email: e,
      password,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    setBusy(false);

    if (error) {
      setMsg({ kind: "error", text: error.message });
      return;
    }

    // Clear/hide fields + go to pending view
    setPassword("");
    setEmail("");
    showPending(e);
  }

  async function handleResend() {
    setMsg(null);

    const e = (pendingEmail || "").trim().toLowerCase();
    if (!e) return;
    if (resendCooldownMs > 0) return;

    setBusy(true);
    const { error } = await supabaseAuth.auth.resend({
      type: "signup",
      email: e,
      options: emailRedirectTo ? { emailRedirectTo } : undefined,
    });
    setBusy(false);

    if (error) {
      setMsg({ kind: "error", text: error.message });
      return;
    }

    setResendCooldownMs(30 * 1000);
    setMsg({ kind: "success", text: "Confirmation email sent." });
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-xl">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setMode("signin");
              if (view === "pending") backToForm();
            }}
            className={`rounded-full px-4 py-2 text-sm ${
              mode === "signin" ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => {
              setMode("signup");
              if (view === "pending") backToForm();
            }}
            className={`rounded-full px-4 py-2 text-sm ${
              mode === "signup" ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
            }`}
          >
            Sign up
          </button>
        </div>

        {msg && (
          <div
            className={`mt-4 rounded-2xl border p-4 text-sm ${
              msg.kind === "error"
                ? "border-red-500/25 bg-red-500/10 text-red-200"
                : "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
            }`}
          >
            {msg.text}
          </div>
        )}

        {view === "pending" ? (
          <div className="mt-5 rounded-3xl border border-emerald-500/15 bg-emerald-500/10 p-5">
            <div className="text-base font-semibold text-emerald-50">Check your email for confirmation.</div>
            <div className="mt-2 text-sm text-emerald-100/80">Didn’t get it? Resend the confirmation email.</div>

            <button
              onClick={handleResend}
              disabled={busy || resendCooldownMs > 0}
              className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {resendCooldownMs > 0 ? `Resend in ${prettySeconds(resendCooldownMs)}s` : "Resend confirmation"}
            </button>

            <button
              onClick={backToForm}
              className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 hover:bg-white/10"
            >
              Back
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs tracking-widest text-white/50">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/20"
                placeholder="you@domain.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs tracking-widest text-white/50">Password</label>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-white/20"
                placeholder="••••••••"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
              />
            </div>

            <button
              onClick={mode === "signup" ? handleSignup : handleSignin}
              disabled={busy || cooldownMs > 0}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-60"
            >
              {cooldownMs > 0
                ? `Try again in ${prettySeconds(cooldownMs)}s`
                : busy
                ? "Working…"
                : mode === "signup"
                ? "Create account"
                : "Sign in"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
