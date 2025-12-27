"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

type Profile = {
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

export default function AccountPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingBusy, setBillingBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    setErr(null);

    const { data } = await supabaseAuth.auth.getUser();
    const u = data.user ?? null;

    if (!u) {
      setUserId(null);
      setEmail(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    setUserId(u.id);
    setEmail(u.email ?? null);

    const { data: p, error } = await supabaseAuth
      .from("profiles")
      .select("plan,stripe_customer_id,stripe_subscription_id")
      .eq("id", u.id)
      .single();

    if (error) {
      // If profile row doesn't exist yet, this will show.
      // Our Supabase trigger fix should prevent this going forward.
      setErr("Profile missing. Please refresh, or contact support.");
      setProfile(null);
    } else {
      setProfile(p as any);
    }

    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supabaseAuth.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function openBillingPortal() {
    if (!userId) return;

    setBillingBusy(true);
    setErr(null);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? "Failed to open billing portal");

      if (json?.url) window.location.href = json.url;
      else throw new Error("No portal URL returned");
    } catch (e: any) {
      setErr(e?.message ?? "Billing portal failed");
    } finally {
      setBillingBusy(false);
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-3xl px-4 py-10 text-white/70">Loading…</main>;
  }

  if (!email) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-white">
        <h1 className="text-4xl font-semibold">Account</h1>
        <div className="mt-6 rounded-3xl border border-white/10 card p-6">
          <p className="text-white/70">You’re not logged in.</p>
          <Link
            href="/login?next=/account"
            className="mt-4 inline-block rounded-2xl bg-white px-4 py-3 font-medium text-black"
          >
            Log in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 text-white">
      <h1 className="text-4xl font-semibold">Account</h1>

      <div className="mt-6 rounded-3xl border border-white/10 card p-6">
        <div className="text-sm text-white/60">Signed in as</div>
        <div className="mt-1 break-all text-lg">{email}</div>

        {err ? (
          <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        ) : null}

        <div className="mt-6 grid gap-2 text-sm text-white/75">
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

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={openBillingPortal}
            disabled={billingBusy}
            className="rounded-2xl bg-white px-4 py-3 font-medium text-black disabled:opacity-50"
          >
            {billingBusy ? "Opening billing…" : "Manage billing"}
          </button>

          <Link
            href="/subscribe"
            className="rounded-2xl border border-white/15 px-4 py-3 text-white/80"
          >
            Upgrade plan
          </Link>

          <button
            onClick={async () => {
              await supabaseAuth.auth.signOut();
              window.location.href = "/";
            }}
            className="rounded-2xl border border-white/15 px-4 py-3 text-white/80"
          >
            Sign out
          </button>
        </div>
      </div>
    </main>
  );
}
