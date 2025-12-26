"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function UpdatePasswordPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // If they got here without a recovery session, they'll be unauthenticated
      setLoading(false);
      if (!data.session) {
        setErr("Your reset link is invalid or expired. Request a new reset email.");
      }
    });
  }, [supabase]);

  async function updatePassword() {
    setBusy(true);
    setErr(null);
    setMsg(null);

    if (password.length < 6) {
      setBusy(false);
      return setErr("Password must be at least 6 characters.");
    }
    if (password !== password2) {
      setBusy(false);
      return setErr("Passwords do not match.");
    }

    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (error) return setErr(error.message);

    setMsg("Password updated. Redirecting…");
    window.location.href = "/account";
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10 text-white">
      <h1 className="text-4xl font-semibold">Set a new password</h1>
      <p className="mt-2 text-white/60">
        Enter a new password for your account.
      </p>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <label className="block">
          <div className="mb-1 text-xs text-white/60">New password</div>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="••••••••"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            autoComplete="new-password"
            disabled={loading || !!err}
          />
        </label>

        <label className="mt-3 block">
          <div className="mb-1 text-xs text-white/60">Confirm new password</div>
          <input
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            type="password"
            placeholder="••••••••"
            className="w-full rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-white outline-none"
            autoComplete="new-password"
            disabled={loading || !!err}
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
          onClick={updatePassword}
          disabled={busy || loading || !!err || !password || !password2}
          className="mt-4 w-full rounded-2xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50"
        >
          {busy ? "Working…" : "Update password"}
        </button>

        <div className="mt-3 text-xs text-white/40">
          If your link expired, go back to <a className="underline" href="/reset-password">Reset password</a>.
        </div>
      </div>
    </main>
  );
}
