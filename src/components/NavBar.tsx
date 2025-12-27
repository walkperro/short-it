"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { motion, AnimatePresence } from "framer-motion";

type Viewer = {
  user: { id: string; email?: string | null } | null;
  profile?: { plan?: string | null; is_admin?: boolean | null } | null;
};

export default function NavBar() {
  const supabase = useMemo(() => {
    // Uses NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }, []);

  const [open, setOpen] = useState(false);
  const [viewer, setViewer] = useState<Viewer>({ user: null, profile: null });

  async function refreshViewer() {
    // Prefer your existing /api/me if present
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json().catch(() => ({}))) as any;
        setViewer({
          user: json?.user ?? null,
          profile: json?.profile ?? null,
        });
        return;
      }
    } catch {}

    // Fallback: ask Supabase directly
    const { data } = await supabase.auth.getUser();
    const user = data.user ?? null;
    setViewer({ user, profile: null });
  }

  useEffect(() => {
    refreshViewer();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshViewer();
    });

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const plan = viewer?.profile?.plan ?? "free";
  const isAdmin = !!viewer?.profile?.is_admin;

  async function signOut() {
    await supabase.auth.signOut();
    setOpen(false);
    refreshViewer();
    // optional: hard refresh if you want
    // window.location.href = "/";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-white/10" />
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">SHORT-IT</div>
            <div className="text-[11px] text-white/50">red • black • white</div>
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/ideas"
            className="rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Ideas
          </Link>

          <Link
            href="/subscribe"
            className="rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Upgrade
          </Link>

          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white hover:bg-white/10"
            >
              {viewer.user ? "Menu" : "Sign in"}
              <span className="ml-2 text-white/50">▾</span>
            </button>

            <AnimatePresence>
              {open ? (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.16 }}
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 bg-black/90 backdrop-blur"
                >
                  <div className="p-3 text-xs text-white/60">
                    Plan: <span className="text-white/90">{String(plan).toUpperCase()}</span>
                    {isAdmin ? <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5">ADMIN</span> : null}
                  </div>

                  <div className="h-px bg-white/10" />

                  <div className="p-2">
                    {viewer.user ? (
                      <>
                        <Link
                          onClick={() => setOpen(false)}
                          href="/account"
                          className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                        >
                          Account
                        </Link>
                        <Link
                          onClick={() => setOpen(false)}
                          href="/admin"
                          className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                        >
                          Admin
                        </Link>
                        <button
                          onClick={signOut}
                          className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-white/80 hover:bg-white/5"
                        >
                          Sign out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          onClick={() => setOpen(false)}
                          href="/login"
                          className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                        >
                          Login
                        </Link>
                        <Link
                          onClick={() => setOpen(false)}
                          href="/subscribe"
                          className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5"
                        >
                          Pick a plan
                        </Link>
                      </>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </nav>
      </div>
    </header>
  );
}
