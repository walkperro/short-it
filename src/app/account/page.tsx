"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

type Profile = {
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  email?: string | null;
};

export default function AccountPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabaseAuth.auth.getSession();
      const user = data.session?.user ?? null;

      if (!user) {
        setEmail(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setEmail(user.email ?? null);

      // Read profile (RLS policy allows user to read own row)
      const { data: p } = await supabaseAuth
        .from("profiles")
        .select("plan,stripe_customer_id,stripe_subscription_id")
        .eq("id", user.id)
        .single();

      setProfile(p ?? null);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-white">Account</h1>

      {loading ? (
        <p className="mt-4 text-sm text-white/60">Loading…</p>
      ) : !email ? (
        <div className="mt-4 rounded-2xl border border-white/10 p-5">
          <p className="text-sm text-white/70">You’re not logged in.</p>
          <Link
            href="/login"
            className="inline-block mt-4 rounded-full bg-white text-black px-4 py-2 text-sm"
          >
            Log in
          </Link>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 p-5">
          <div className="text-sm text-white/70">Signed in as</div>
          <div className="mt-1 text-base text-white">{email}</div>

          <div className="mt-4 grid gap-2 text-sm text-white/75">
            <div>
              <span className="text-white/50">Plan:</span>{" "}
              <span className="text-white">{profile?.plan ?? "free"}</span>
            </div>
            <div>
              <span className="text-white/50">Stripe Customer:</span>{" "}
              <span className="text-white/70">{profile?.stripe_customer_id ?? "—"}</span>
            </div>
            <div>
              <span className="text-white/50">Stripe Subscription:</span>{" "}
              <span className="text-white/70">{profile?.stripe_subscription_id ?? "—"}</span>
            </div>
          </div>

          <Link
            href="/subscribe"
            className="inline-block mt-5 rounded-full border border-white/15 px-4 py-2 text-sm text-white/85"
          >
            Manage subscription
          </Link>
        </div>
      )}
    </main>
  );
}
