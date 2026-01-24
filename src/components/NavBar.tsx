"use client";

import Link from "next/link";
import LockIcon from "@/components/LockIcon";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import UserMenu from "@/components/UserMenu";
import { canAccess, normalizePlan, type Plan } from "@/lib/entitlements";

type Me = {
  user: { id: string; email?: string | null } | null;
  is_admin?: boolean;
  plan?: string;
};

function Tab({
  href,
  label,
  active,
  locked,
}: {
  href: string;
  label: string;
  active: boolean;
  locked: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group relative flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition",
        active
          ? "bg-white text-black"
          : "bg-white/5 text-white/80 hover:bg-white/10",
      ].join(" ")}
      aria-disabled={locked ? true : undefined}
    >
      <span className="tracking-tight">{label}</span>

      {locked ? (
        <span className="ml-1 inline-flex items-center justify-center rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-white/80">
          <LockIcon className="h-4 w-4 text-white/70" />
        </span>
      ) : null}
    </Link>
  );
}

export default function NavBar() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

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

  const plan = normalizePlan(me?.plan);
  const isAdmin = Boolean(me?.is_admin);
  const ready = me !== null;

  const lockConviction = ready
    ? !isAdmin && !canAccess(plan, "conviction")
    : false;
  const lockMacro = ready ? !isAdmin && !canAccess(plan, "macro") : false;

  const active = useMemo(() => {
    if (pathname?.startsWith("/macro")) return "macro";
    if (pathname?.startsWith("/conviction")) return "conviction";
    return "ideas";
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-2xl bg-red-600 text-white font-black">
            S
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">SHORT-IT</div>
            <div className="text-[11px] tracking-widest text-white/50">
              TRADE INTEL
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <Tab
            href="/ideas"
            label="Ideas"
            active={active === "ideas"}
            locked={false}
          />
          <Tab
            href="/conviction"
            label="Conviction"
            active={active === "conviction"}
            locked={lockConviction}
          />
          <Tab
            href="/macro"
            label="Macro"
            active={active === "macro"}
            locked={lockMacro}
          />
        </nav>

        <div className="flex items-center gap-2">
          {/* Mobile tabs */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/ideas"
              className={[
                "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                active === "ideas"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/80",
              ].join(" ")}
            >
              Ideas
            </Link>
            <Link
              href="/conviction"
              className={[
                "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                active === "conviction"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/80",
              ].join(" ")}
            >
              {lockConviction ? (
                <span className="mr-1 inline-flex items-center justify-center rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 text-white/80">
                  <LockIcon className="h-3.5 w-3.5 text-white/70" />
                </span>
              ) : null}
              Conv
            </Link>
            <Link
              href="/macro"
              className={[
                "rounded-2xl px-3 py-2 text-xs font-semibold transition",
                active === "macro"
                  ? "bg-white text-black"
                  : "bg-white/5 text-white/80",
              ].join(" ")}
            >
              {lockMacro ? (
                <span className="mr-1 inline-flex items-center justify-center rounded-full border border-white/10 bg-black/30 px-1.5 py-0.5 text-white/80">
                  <LockIcon className="h-3.5 w-3.5 text-white/70" />
                </span>
              ) : null}
              Macro
            </Link>
          </div>

          <UserMenu />
        </div>
      </div>
    </header>
  );
}
