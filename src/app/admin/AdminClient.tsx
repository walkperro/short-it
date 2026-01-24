"use client";

import { useState } from "react";
import IdeasAdmin from "./IdeasAdmin";
import ConvictionAdmin from "./ConvictionAdmin";

type Tab = "ideas" | "conviction";

export default function AdminClient() {
  const [tab, setTab] = useState<Tab>("ideas");

  return (
    <main className="mx-auto max-w-6xl p-6 text-white">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
          <p className="mt-1 text-sm text-white/60">
            Manage Ideas and Convictions.
          </p>
        </div>

        <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setTab("ideas")}
            className={[
              "rounded-2xl px-4 py-2 text-sm",
              tab === "ideas"
                ? "bg-white text-black font-semibold"
                : "text-white/80 hover:bg-white/10",
            ].join(" ")}
          >
            Ideas
          </button>
          <button
            onClick={() => setTab("conviction")}
            className={[
              "rounded-2xl px-4 py-2 text-sm",
              tab === "conviction"
                ? "bg-white text-black font-semibold"
                : "text-white/80 hover:bg-white/10",
            ].join(" ")}
          >
            Conviction
          </button>
        </div>
      </div>

      <div className="mt-6">
        {tab === "ideas" ? <IdeasAdmin /> : <ConvictionAdmin />}
      </div>
    </main>
  );
}
