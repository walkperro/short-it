"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

type Me = {
  user: { id: string; email?: string | null } | null;
  is_admin?: boolean;
  plan?: "free" | "ideas" | "conviction" | "macro" | string;
};

function canSeeConviction(me: Me | null) {
  if (!me?.user) return false;
  if (me.is_admin) return true;
  return me.plan === "conviction" || me.plan === "macro";
}

function canSeeMacro(me: Me | null) {
  if (!me?.user) return false;
  if (me.is_admin) return true;
  return me.plan === "macro";
}

export default function TopTabs() {
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch("/api/me", { cache: "no-store" }).catch(
        () => null,
      );
      if (!alive) return;
      const json = await res?.json().catch(() => ({}));
      setMe((json ?? { user: null }) as Me);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const lockedConv = useMemo(() => !canSeeConviction(me), [me]);
  const lockedMacro = useMemo(() => !canSeeMacro(me), [me]);

  return (
    <nav className="flex items-center gap-2">
      <Tab href="/ideas" active={pathname?.startsWith("/ideas")}>
        Ideas
      </Tab>

      <Tab
        href={lockedConv ? "/subscribe" : "/conviction"}
        active={pathname?.startsWith("/conviction")}
        locked={lockedConv}
      >
        Conviction
      </Tab>

      <Tab
        href={lockedMacro ? "/subscribe" : "/macro"}
        active={pathname?.startsWith("/macro")}
        locked={lockedMacro}
      >
        Macro
      </Tab>
    </nav>
  );
}

function Tab({
  href,
  children,
  active,
  locked,
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition",
        active
          ? "bg-white text-black"
          : "border border-white/10 bg-white/5 text-white/80 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
      {locked ? <LockIcon /> : null}
    </Link>
  );
}

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      className="opacity-80"
    >
      <path
        d="M7 11V8a5 5 0 0 1 10 0v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 11h12v10H6V11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
