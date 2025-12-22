"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    (async () => {
      // Supabase client reads tokens from URL hash automatically
      const { data, error } = await supabaseAuth.auth.getSession();

      // Always clean URL
      window.history.replaceState({}, document.title, "/");

      if (error || !data.session) {
        setMsg("Sign-in failed or link expired. Please request a new magic link.");
        return;
      }

      // Go somewhere deterministic
      window.location.replace("/account");
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl border p-6">
        <h1 className="text-xl font-semibold">Auth</h1>
        <p className="mt-3 text-sm text-black/70">{msg}</p>
      </div>
    </main>
  );
}
