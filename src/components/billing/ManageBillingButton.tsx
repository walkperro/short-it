"use client";

import { useState } from "react";

export default function ManageBillingButton({
  label = "Manage billing",
}: {
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  async function go() {
    try {
      setLoading(true);
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "Failed to open billing portal");
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      alert(e?.message || "Could not open billing portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 disabled:opacity-60"
    >
      {loading ? "Opening…" : label}
    </button>
  );
}
