"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/` : undefined }
    });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl p-6 border" style={{borderColor:"#1e1e22", background:"#111113"}}>
        <h1 className="text-xl font-semibold mb-2">Sign in to Short-It</h1>
        <p className="text-sm opacity-80 mb-4">We’ll send a magic link to your email.</p>
        <form onSubmit={handleSend} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded bg-transparent border"
            style={{borderColor:"#1e1e22"}}
          />
          <button className="w-full px-3 py-2 rounded border font-medium" style={{borderColor:"#1e1e22"}}>Send magic link</button>
        </form>
        {sent && <div className="mt-3 text-sm text-green-400">Check your email for the sign-in link.</div>}
        {error && <div className="mt-3 text-sm text-red-400">{error}</div>}
        <div className="mt-6 text-sm opacity-70">
          <Link href="/">← Back to app</Link>
        </div>
      </div>
    </div>
  );
}
