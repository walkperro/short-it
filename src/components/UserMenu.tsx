"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { levelLabelFromPlan, normalizePlan } from "@/lib/entitlements";

type Me = {
  user: { id: string; email?: string | null } | null;
  is_admin?: boolean;
  plan?: "free" | "ideas" | "conviction" | "macro" | string;
};

function initials(email?: string | null) {
  const e = (email ?? "").trim();
  if (!e) return "U";
  return e[0].toUpperCase();
}

export default function UserMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    setOpen(false); // retract on navigation
  }, [pathname]);

  useEffect(() => {
    let alive = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => alive && setMe(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const isAuthed = !!me?.user;
  const plan = normalizePlan(me?.plan);
  const badge = me?.is_admin ? { short: "A", long: "ADMIN" } : levelLabelFromPlan(plan);

  function close() {
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white/90 hover:bg-white/10"
        aria-label="Open menu"
      >
        <span>{initials(me?.user?.email ?? null)}</span>

        {/* Level badge */}
        <span className="absolute -bottom-1 -right-1 rounded-full border border-black/60 bg-brand-red px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {badge.short}
        </span>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl"
          >
            <div className="px-3 py-3">
              <div className="text-xs tracking-widest text-white/50">{me?.is_admin ? "ADMIN" : badge.long}</div>
              <div className="mt-1 truncate text-sm text-white/90">{me?.user?.email ?? "Not signed in"}</div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="p-2">
              <MenuLink href="/plans" onNavigate={close}>
                Plans
              </MenuLink>
              {isAuthed ? (
                <>
                  <MenuLink href="/account" onNavigate={close}>
                    Account
                  </MenuLink>
                  <MenuLink href="/admin" onNavigate={close}>
                    Admin
                  </MenuLink>
                  <button
                    onClick={async () => {
                      close();
                      await fetch("/api/auth/signout", { method: "POST" }).catch(() => {});
                      location.href = "/";
                    }}
                    className="mt-1 w-full rounded-xl px-3 py-2 text-left text-sm text-white/80 hover:bg-white/10"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <MenuLink href="/login" onNavigate={close}>
                  Sign in
                </MenuLink>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  children,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/10"
    >
      {children}
    </Link>
  );
}
