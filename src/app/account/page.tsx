"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabaseAuth.auth.getSession();
      const user = s.session?.user;
      setEmail(user?.email ?? null);

      if (!user) return;

      const { data, error } = await supabaseAuth
        .from("profiles")
        .select("plan")
        .eq("id", user.id)
        .single();

      if (error) setErr(error.message);
      else setPlan(data?.plan ?? null);
    })();
  }, []);

  async function signOut() {
    await supabaseAuth.auth.signOut();
    window.location.replace("/");
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-2 text-sm text-black/70">Signed in as: {email ?? "Not signed in"}</p>

      {err && <div className="mt-4 rounded-2xl border p-4 text-sm">Error: {err}</div>}

      {plan && (
        <div className="mt-4 rounded-2xl border p-4 text-sm">
          <span className="font-medium">Plan:</span> {plan}
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <a href="/ideas" className="rounded-2xl border px-4 py-2 text-sm">Ideas</a>
        <button onClick={signOut} className="rounded-2xl bg-black text-white px-4 py-2 text-sm">
          Sign out
        </button>
      </div>
    </main>
  );
}
