"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabaseAuth } from "@/lib/supabase/auth-client";
import { getSiteUrl } from "@/lib/site-url";

export default function LoginClient() {
  const sp = useSearchParams();
  const next = sp.get("next") || "/account";

  const siteUrl = useMemo(() => getSiteUrl(), []);
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`;

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signInPassword() {
    setBusy(true);
    setError(null);
    setStatus(null);

    const { error } = await supabaseAuth.auth.signInWithPassword({ email, password });

    setBusy(false);
    if (error) return setError(error.message);

    setStatus("Signed in. Redirecting…");
    window.location.href = next;
  }

  async function signUpPassword() {
    setBusy(true);
    setError(null);
    setStatus(null);

    const { error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo },
    });

    setBusy(false);
    if (error) return setError(error.message);

    setStatus("Account created. If email confirmation is enabled, check your inbox.");
  }

  async function sendMagicLink() {
    setBusy(true);
    setError(null);
    setStatus(null);

    const { error } = await supabaseAuth.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    setBusy(false);
    if (error) return setError(error.message);

    setStatus("Magic link sent. Check your email.");
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-white">
      <h1 className="text-4xl font-semibold">Log in</h1>
      <p className="mt-2 text-white/60">Use email + password (recommended). Magic link is optional.</p>

      <div className="mt-6 rounded-3xl border border-white/10 card p-6">
        <div className="flex gap-2">
          <button
            onClick={() => setMode("signin")}
            className={`rounded-full px-4 py-2 text-sm ${
              mode === "signin" ? "bg-white text-black" : "border border-white/15 text-white/80"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-full px-4 py-2 text-sm ${
              mode === "signup" ? "bg-white text-black" : "border border-white/15 text-white/80"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block">
            <div className="mb-1 text-xs text-white/60">Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full rounded-2xl border border-white/10 card px-4 py-3 text-white outline-none"
              autoComplete="email"
            />
          </label>

          <label className="block">
            <div className="mb-1 text-xs text-white/60">Password</div>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/10 card px-4 py-3 text-white outline-none"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {status ? (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              {status}
            </div>
          ) : null}

          {mode === "signin" ? (
            <button
              onClick={signInPassword}
              disabled={busy || !email || !password}
              className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50"
            >
              {busy ? "Working…" : "Sign in"}
            </button>
          ) : (
            <button
              onClick={signUpPassword}
              disabled={busy || !email || !password}
              className="w-full rounded-2xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50"
            >
              {busy ? "Working…" : "Create account"}
            </button>
          )}

          <div className="mt-2 flex items-center justify-between gap-3">
            <button
              onClick={sendMagicLink}
              disabled={busy || !email}
              className="rounded-2xl border border-white/15 px-4 py-3 text-sm text-white/80 disabled:opacity-50"
            >
              Send magic link
            </button>
            <a className="text-sm text-white/60 underline" href="/reset-password">
              Forgot password?
            </a>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-white/40">
        Redirect URL used for auth emails: <span className="break-all">{redirectTo}</span>
      </p>
    </main>
  );
}
