"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";

export default function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) {
    return (
      <Link
        href="/login"
        className="text-sm text-white/70 hover:text-brand-red transition"
      >
        Log in
      </Link>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-red text-sm font-semibold text-white"
      >
        {user.email?.[0]?.toUpperCase()}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-44 origin-top-right animate-dropdown rounded-xl border border-white/10 bg-black/90 p-2 backdrop-blur">
          <Link
            href="/account"
            className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Account
          </Link>

          <Link
            href="/admin"
            className="block rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/10"
          >
            Admin
          </Link>

          <button
            onClick={async () => {
              await signOut();
              window.location.href = "/";
            }}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
