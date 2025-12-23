"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Completing sign-in...");

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (!code) {
        setMsg("No auth code found. Please request a new magic link.");
        return;
      }

      const { error } = await supabaseAuth.auth.exchangeCodeForSession(code);

      // Clean URL
      window.history.replaceState({}, document.title, "/");

      if (error) {
        setMsg("Sign-in failed. Please request a new magic link.");
        return;
      }

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
