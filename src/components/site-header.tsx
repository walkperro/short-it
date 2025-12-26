"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export function SiteHeader() {
  const { user, loading, signOut } = useAuth();

  return (
    <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-white">
      <Link href="/" className="text-sm tracking-widest text-white/80">
        SHORT-IT
      </Link>

      <nav className="flex items-center gap-3">
        <Link className="rounded-full border border-white/10 px-4 py-2 text-sm" href="/ideas">
          Ideas
        </Link>
        <Link className="rounded-full border border-white/10 px-4 py-2 text-sm" href="/subscribe">
          Subscribe
        </Link>
        <Link className="rounded-full border border-white/10 px-4 py-2 text-sm" href="/account">
          Account
        </Link>

        <div className="ml-2 flex items-center gap-3">
          {!loading && user?.email ? (
            <>
              <span className="max-w-[140px] truncate text-xs text-white/60">{user.email}</span>
              <button
                onClick={() => signOut()}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
