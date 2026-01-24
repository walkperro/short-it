"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

function safeEvent(name: string, params?: Record<string, any>) {
  try {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag("event", name, params || {});
    }
  } catch {}
}

function getTeaserContext(pathname: string) {
  // /ideas/<slug> (but NOT /ideas)
  const m1 = pathname.match(/^\/ideas\/([^\/]+)$/);
  if (m1) return { isTeaser: true, teaser_type: "ideas", teaser_slug: m1[1] };

  // /conviction/<slug> (but NOT /conviction)
  const m2 = pathname.match(/^\/conviction\/([^\/]+)$/);
  if (m2)
    return { isTeaser: true, teaser_type: "conviction", teaser_slug: m2[1] };

  return { isTeaser: false as const };
}

function fireRouteEvents(pathname: string) {
  // Full pages (paid/unlocked)
  const f1 = pathname.match(/^\/ideas\/([^\/]+)\/full$/);
  if (f1) {
    safeEvent("view_idea_full", {
      page_path: pathname,
      teaser_type: "ideas",
      teaser_slug: f1[1],
    });
  }

  const f2 = pathname.match(/^\/conviction\/([^\/]+)\/full$/);
  if (f2) {
    safeEvent("view_conviction_full", {
      page_path: pathname,
      teaser_type: "conviction",
      teaser_slug: f2[1],
    });
  }

  // Key funnel pages
  if (pathname === "/subscribe")
    safeEvent("view_subscribe", { page_path: pathname });
  if (pathname === "/pricing")
    safeEvent("view_pricing", { page_path: pathname });
  if (pathname === "/macro") safeEvent("view_macro", { page_path: pathname });

  // Teaser page views
  const ctx = getTeaserContext(pathname);
  if (ctx.isTeaser) {
    safeEvent("view_teaser", {
      page_path: pathname,
      teaser_type: (ctx as any).teaser_type,
      teaser_slug: (ctx as any).teaser_slug,
    });
  }
}

export default function AnalyticsEvents() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  // Fire events on route change
  useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    fireRouteEvents(pathname);
  }, [pathname]);

  // Global click tracking for subscribe CTA
  useEffect(() => {
    function onClick(e: MouseEvent) {
      try {
        let el = e.target as HTMLElement | null;

        // Walk up to nearest anchor
        while (el && el !== document.body) {
          if (el.tagName === "A") break;
          el = el.parentElement;
        }
        if (!el) return;

        const a = el as HTMLAnchorElement;
        const href = a.getAttribute("href") || "";
        if (href === "/subscribe" || href.startsWith("/subscribe?")) {
          const p =
            window.location && window.location.pathname
              ? window.location.pathname
              : "";
          const ctx = getTeaserContext(p);

          safeEvent("subscribe_click", {
            link_url: href,
            page_path: p,
            cta_context: ctx.isTeaser ? "teaser" : "site",
            teaser_type: (ctx as any).teaser_type || undefined,
            teaser_slug: (ctx as any).teaser_slug || undefined,
          });
        }
      } catch {}
    }

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
