"use client";

import { useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabaseAuth.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `/auth/callback`,
      },
    });
    if (!error) setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <form onSubmit={signIn} className="w-full max-w-sm rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Sign in</h1>

        {sent ? (
          <p className="mt-4 text-sm text-black/70">
            Magic link sent. Check your email.
          </p>
        ) : (
          <>
            <input
              type="email"
              placeholder="you@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-4 w-full rounded-xl border px-3 py-2 text-sm"
            />

            <button
              type="submit"
              className="mt-4 w-full rounded-xl bg-black py-2 text-sm text-white"
            >
              Send magic link
            </button>
          </>
        )}
      </form>
    </main>
  );
}
