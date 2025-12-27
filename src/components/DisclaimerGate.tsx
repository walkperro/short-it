"use client";

import { useEffect, useState } from "react";

const KEY = "shortit_disclaimer_accepted_v1";

export default function DisclaimerGate({ children }: { children: React.ReactNode }) {
  const [accepted, setAccepted] = useState<boolean>(true); // default true to avoid flash during hydration
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setAccepted(v === "1");
    } catch {
      // If localStorage blocked, fall back to showing gate
      setAccepted(false);
    } finally {
      setReady(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setAccepted(true);
  }

  // Wait until client knows whether they accepted; avoid mismatch / flicker
  if (!ready) return <>{children}</>;

  if (accepted) return <>{children}</>;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0B0B0B] p-6 text-white shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3">
            <img src="/bear.svg" alt="Bear" className="h-12 w-12" />
          </div>

          <div className="min-w-0">
            <div className="text-xs tracking-widest text-white/60">SHORT-IT • RISK DISCLOSURE</div>
            <h1 className="mt-2 text-2xl font-semibold">Read this before you enter</h1>
            <p className="mt-2 text-sm text-white/70">
              Short-It content is for <span className="text-white">educational purposes only</span>. Nothing on this
              site is financial advice, investment advice, or a recommendation to buy or sell any security.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
          <ul className="list-disc space-y-2 pl-5">
            <li>You are responsible for your own trades, risk management, and tax obligations.</li>
            <li>Trading involves substantial risk and can result in losses up to your full investment.</li>
            <li>Past performance does not guarantee future results.</li>
            <li>By continuing, you confirm you are of legal age in your jurisdiction to trade.</li>
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <a
            className="text-xs text-white/50 underline underline-offset-4"
            href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/investor-bulletin-understanding-risk"
            target="_blank"
            rel="noreferrer"
          >
            Learn about trading risk
          </a>

          <button
            onClick={accept}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black hover:opacity-95 active:opacity-90"
          >
            I understand • Enter
          </button>
        </div>

        <div className="mt-4 text-xs text-white/40">
          This acknowledgement is stored in your browser. Clear site data to see this screen again.
        </div>
      </div>
    </div>
  );
}
