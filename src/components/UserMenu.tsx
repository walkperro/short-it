"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { levelLabelFromPlan, normalizePlan } from "@/lib/entitlements";

type Me = {
  user: { id: string; email?: string | null } | null;
  is_admin?: boolean;
  plan?: "free" | "ideas" | "conviction" | "macro";
};

function initials(email: string | null) {
  if (!email) return "U";
  const s = email.split("@")[0] || "U";
  return (s[0] || "U").toUpperCase();
}

async function fetchMe(): Promise<Me | null> {
  try {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as Me;
  } catch {
    return null;
  }
}

function badgeShortFromPlan(plan: Me["plan"]) {
  const p = normalizePlan(plan ?? "free");
  if (p === "ideas") return "I";
  if (p === "conviction") return "II";
  if (p === "macro") return "III";
  return "FREE";
}

function MenuLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="block rounded-xl px-3 py-2 text-sm text-white/85 hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

export default function UserMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetchMe().then(setMe);
  }, [pathname]);

  const isAuthed = !!me?.user;
  const plan = normalizePlan(me?.plan ?? "free");
  const levelLong = levelLabelFromPlan(plan);
  const badgeShort = badgeShortFromPlan(plan);

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
          {badgeShort}
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
              <div className="text-xs tracking-widest text-white/50">
                {me?.is_admin ? "ADMIN" : levelLong}
              </div>
              <div className="mt-1 truncate text-sm text-white/90">
                {me?.user?.email ?? "Not signed in"}
              </div>
            </div>

            <div className="h-px bg-white/10" />

            <div className="p-2">
              <MenuLink href="/subscribe" onNavigate={close}>
                Plans
              </MenuLink>

              {isAuthed ? (
                <>
                  <MenuLink href="/account" onNavigate={close}>
                    Account
                  </MenuLink>

                  {/* HIDE ADMIN COMPLETELY UNLESS ADMIN */}
                  {me?.is_admin ? (
                    <MenuLink href="/admin" onNavigate={close}>
                      Admin
                    </MenuLink>
                  ) : null}

                  <button
                    onClick={async () => {
                      await fetch("/api/logout", { method: "POST" });
                      close();
                      window.location.href = "/login";
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 hover:bg-white/10"
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
