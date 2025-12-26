"use client";

import { useEffect } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      // This ensures the session is picked up after redirect
      await supabaseAuth.auth.getSession();
      window.location.href = "/account";
    })();
  }, []);

  return (
    <main className="p-6 max-w-md mx-auto">
      <p className="text-sm text-white/70">Signing you in…</p>
    </main>
  );
}
