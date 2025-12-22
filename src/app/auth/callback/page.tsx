"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

export default function AuthCallback() {
  const [msg, setMsg] = useState("Signing you in...");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Supabase client will read tokens from URL hash automatically.
      const { data, error } = await supabaseAuth.auth.getSession();

      if (cancelled) return;

      if (error || !data.session) {
        setMsg("Could not complete sign-in. Please try again.");
        // Clean URL anyway
        window.history.replaceState({}, document.title, "/login");
        return;
      }

      // ✅ Clean the URL (removes #access_token…)
      window.history.replaceState({}, document.title, "/");

      // Optional: force a refresh so server components reflect auth later
      window.location.replace("/account");
    })();

    return () => {
      cancelled = true;
    };
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
