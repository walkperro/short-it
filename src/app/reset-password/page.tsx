"use client";

import { useMemo, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";
import { getSiteUrl } from "@/lib/site-url";

export default function ResetPasswordPage() {
  const siteUrl = useMemo(() => getSiteUrl(), []);
  const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent("/update-password")}`;

  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sendReset() {
    setBusy(true);
    setErr(null);
    setMsg(null);

    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setBusy(false);
    if (error) return setErr(error.message);
    setMsg("Password reset email sent. Check your inbox.");
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-white">
      <h1 className="text-4xl font-semibold">Reset password</h1>
      <p className="mt-2 text-white/60">We’ll email you a reset link.</p>

      <div className="mt-6 rounded-3xl border border-white/10 card p-6">
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

        {err ? (
          <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        {msg ? (
          <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {msg}
          </div>
        ) : null}

        <button
          onClick={sendReset}
          disabled={busy || !email}
          className="mt-4 w-full rounded-2xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50"
        >
          {busy ? "Working…" : "Send reset email"}
        </button>
      </div>
    </main>
  );
}
