"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

function siteUrl() {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://short-it.trade";
}

export default function LoginPage() {
  const redirectTo = useMemo(() => `${siteUrl()}/auth/callback`, []);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseAuth.auth.getSession();
      if (data.session) window.location.href = "/account";
    })();
  }, []);

  async function signInWithGoogle() {
    setErr(null); setMsg(null);
    const { error } = await supabaseAuth.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo }
    });
    if (error) setErr(error.message);
  }

  async function sendMagicLink() {
    setErr(null); setMsg(null);
    setLoading(true);
    const { error } = await supabaseAuth.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setMsg("Check your email for a sign-in link.");
  }

  async function emailPassword() {
    setErr(null); setMsg(null);
    setLoading(true);

    const fn = mode === "signin"
      ? supabaseAuth.auth.signInWithPassword
      : supabaseAuth.auth.signUp;

    // @ts-ignore
    const { error } = await fn({ email, password });

    setLoading(false);
    if (error) setErr(error.message);
    else setMsg(mode === "signin" ? "Signed in." : "Account created. Check your email if confirmation is required.");
    if (!error) window.location.href = "/account";
  }

  return (
    <main className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-semibold text-white">Log in</h1>
      <p className="mt-2 text-sm text-white/60">
        Use Google, a magic link, or email + password.
      </p>

      {(err || msg) && (
        <div className={`mt-4 rounded-2xl border p-4 text-sm ${
          err ? "border-red-500/30 bg-red-500/10 text-red-200" : "border-white/10 bg-white/5 text-white/70"
        }`}>
          {err ?? msg}
        </div>
      )}

      <button
        onClick={signInWithGoogle}
        className="mt-6 w-full rounded-2xl bg-white text-black px-4 py-3 text-sm"
      >
        Continue with Google
      </button>

      <div className="mt-6 rounded-2xl border border-white/10 p-4">
        <label className="text-xs text-white/60">Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@domain.com"
          className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none"
        />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            onClick={sendMagicLink}
            disabled={!email || loading}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/85 disabled:opacity-60"
          >
            Send magic link
          </button>

          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="rounded-xl border border-white/15 px-3 py-2 text-sm text-white/70"
          >
            {mode === "signin" ? "Need an account?" : "Have an account?"}
          </button>
        </div>

        <div className="mt-6">
          <label className="text-xs text-white/60">Password (optional)</label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            className="mt-2 w-full rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white outline-none"
          />
          <button
            onClick={emailPassword}
            disabled={!email || !password || loading}
            className="mt-3 w-full rounded-xl bg-white/10 text-white px-3 py-2 text-sm disabled:opacity-60"
          >
            {mode === "signin" ? "Sign in with password" : "Create account"}
          </button>
        </div>
      </div>
    </main>
  );
}
