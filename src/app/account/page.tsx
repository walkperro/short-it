"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

type Profile = {
  id: string;
  email: string | null;
  plan: string;
  created_at: string;
};

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabaseAuth.auth.getSession();
      setEmail(s.session?.user?.email ?? null);

      if (!s.session?.user) return;

      const { data, error } = await supabaseAuth
        .from("profiles")
        .select("id,email,plan,created_at")
        .eq("id", s.session.user.id)
        .single();

      if (error) setErr(error.message);
      else setProfile(data as Profile);
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

      {profile && (
        <div className="mt-4 rounded-2xl border p-4 text-sm">
          <div><span className="font-medium">Plan:</span> {profile.plan}</div>
          <div className="text-black/70 mt-1">User: {profile.id}</div>
        </div>
      )}

      <div className="mt-6 flex gap-3">
        <a className="rounded-2xl border px-4 py-2 text-sm" href="/ideas">Ideas</a>
        <button className="rounded-2xl bg-black text-white px-4 py-2 text-sm" onClick={signOut}>
          Sign out
        </button>
      </div>
    </main>
  );
}
