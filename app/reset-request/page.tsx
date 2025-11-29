"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function ResetRequestPage() {
  const [email, setEmail] = useState("");
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string|null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOk(false);
    const redirect = typeof window !== "undefined" ? `${window.location.origin}/reset` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirect });
    if (error) { setErr(error.message); return; }
    setOk(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 border"
        style={{borderColor:"#1e1e22", background:"#111113"}}>
        
        <h1 className="text-xl font-semibold mb-2">Reset your password</h1>
        <p className="text-sm opacity-80 mb-4">We’ll email you a secure reset link.</p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" required placeholder="you@example.com"
            value={email} onChange={(e)=>setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded bg-transparent border"
            style={{borderColor:"#1e1e22"}} />

          <button className="w-full px-3 py-2 rounded border font-medium"
            style={{borderColor:"#1e1e22"}}>Send reset link</button>
        </form>

        {ok && <div className="mt-3 text-sm text-green-400">Email sent!</div>}
        {err && <div className="mt-3 text-sm text-red-400">{err}</div>}

        <div className="mt-6 text-sm opacity-70">
          <Link href="/sign-in">← Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
