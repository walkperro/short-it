"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabaseAuth } from "@/lib/supabase/auth-client";

type UserState = {
  email: string | null;
};

export default function SiteHeader() {
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const { data } = await supabaseAuth.auth.getSession();
    const u = data.session?.user ?? null;
    setUser(u ? { email: u.email ?? null } : null);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    const { data: sub } = supabaseAuth.auth.onAuthStateChange(() => refresh());
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabaseAuth.auth.signOut();
    // refresh() will be triggered by onAuthStateChange
    window.location.href = "/";
  }

  return (
    <header className="w-full px-6 py-4">
      <div className="mx-auto max-w-5xl flex items-center justify-between">
        <Link href="/" className="text-sm tracking-wide text-white/90">
          SHORT-IT
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/ideas"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80"
          >
            Ideas
          </Link>

          <Link
            href="/subscribe"
            className="rounded-full bg-white/10 px-4 py-2 text-sm text-white/90"
          >
            Subscribe
          </Link>

          <Link
            href="/account"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80"
          >
            Account
          </Link>

          <div className="ml-2 flex items-center gap-3">
            {loading ? (
              <div className="text-xs text-white/50">…</div>
            ) : user ? (
              <>
                <div className="hidden sm:block text-xs text-white/60 max-w-[220px] truncate">
                  {user.email ?? "Signed in"}
                </div>
                <button
                  onClick={signOut}
                  className="rounded-full bg-white text-black px-4 py-2 text-sm"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-white text-black px-4 py-2 text-sm"
              >
                Log in
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
