"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseAuth.auth.getSession();
      setEmail(data.session?.user?.email ?? null);
    })();
  }, []);

  async function signOut() {
    await supabaseAuth.auth.signOut();
    window.location.replace("/");
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-semibold">Account</h1>
      <p className="mt-2 text-sm text-black/70">
        Signed in as: {email ?? "Not signed in"}
      </p>

      <div className="mt-6 flex gap-3">
        <a className="rounded-2xl border px-4 py-2 text-sm" href="/login">Login</a>
        <button className="rounded-2xl bg-black text-white px-4 py-2 text-sm" onClick={signOut}>
          Sign out
        </button>
      </div>
    </main>
  );
}
