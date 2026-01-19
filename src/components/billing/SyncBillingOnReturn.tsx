"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SyncBillingOnReturn({ enabled }: { enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    (async () => {
      try {
        await fetch("/api/billing/sync", { method: "POST" });
      } finally {
        // Remove ?sync=1 from the URL (clean)
        try {
          const url = new URL(window.location.href);
          url.searchParams.delete("sync");
          router.replace(url.pathname + (url.search ? url.search : ""));
        } catch {
          router.replace("/account");
        }
      }
    })();
  }, [enabled, router]);

  return null;
}
