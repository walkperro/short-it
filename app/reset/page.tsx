"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResetPage() {
  const [ready, setReady] = useState(false);
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState<string|null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (hash.includes("access_token")) {
      supabase.auth.exchangeCodeForSession(hash).finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false);

    if (pw1.length < 8) return setErr("Password must be at least 8 characters.");
    if (pw1 !== pw2) return setErr("Passwords do not match.");

    const { error } = await supabase.auth.updateUser({ password: pw1 });
    if (error) return setErr(error.message);

    setOk(true);
    await supabase.auth.signOut();
    setTimeout(()=>{ window.location.href = "/sign-in"; }, 1200);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 border"
        style={{borderColor:"#1e1e22", background:"#111113"}}>
        
        <h1 className="text-xl font-semibold mb-2">Set a new password</h1>
        {!ready && <div className="text-sm opacity-80">Verifying link…</div>}

        {ready && (
          <form onSubmit={onSubmit} className="space-y-3">
            <input type="password" required placeholder="New password"
              value={pw1} onChange={e=>setPw1(e.target.value)}
              className="w-full px-3 py-2 rounded bg-transparent border"
              style={{borderColor:"#1e1e22"}} />

            <input type="password" required placeholder="Confirm new password"
              value={pw2} onChange={e=>setPw2(e.target.value)}
              className="w-full px-3 py-2 rounded bg-transparent border"
              style={{borderColor:"#1e1e22"}} />

            <button disabled={!ready}
              className="w-full px-3 py-2 rounded border font-medium disabled:opacity-60"
              style={{borderColor:"#1e1e22"}}>Update password</button>
          </form>
        )}

        {ok && <div className="mt-3 text-sm text-green-400">Password updated.</div>}
        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

        <div className="mt-6 text-sm opacity-70">
          <Link href="/sign-in">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
