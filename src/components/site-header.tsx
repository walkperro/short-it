"use client";

import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-brand-border bg-brand-black/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          <span className="text-brand-red">SHORT</span>
          <span className="text-white">-IT</span>
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/ideas"
            className="rounded-full px-4 py-2 text-sm text-white/80 hover:text-white transition"
          >
            Ideas
          </Link>
          <UserMenu />
        </nav>
      </div>
    </header>
  );
}


