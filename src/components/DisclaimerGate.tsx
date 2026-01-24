"use client";

import { useEffect, useState } from "react";

const KEY = "shortit_disclaimer_ack_v1";

export default function DisclaimerGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ok, setOk] = useState(true);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setOk(v === "1");
    } catch {
      setOk(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setOk(true);
  }

  if (ok) return <>{children}</>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-black">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <div className="glass-dark p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 shrink-0 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="grid h-full w-full place-items-center rounded-xl bg-black/40 text-sm">
                🐻
              </div>
            </div>

            <div className="flex-1">
              <div className="text-xs tracking-[0.25em] text-white/60">
                SHORT-IT • RISK DISCLOSURE
              </div>
              <h1 className="mt-2 text-3xl font-semibold leading-tight">
                Read this before you enter
              </h1>
              <p className="mt-3 text-white/70">
                Short-It content is for educational purposes only. Nothing on
                this site is financial advice, investment advice, or a
                recommendation to buy or sell any security.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5 text-white/70">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                You are responsible for your own trades, risk management, and
                tax obligations.
              </li>
              <li>
                Trading involves substantial risk and can result in losses up to
                your full investment.
              </li>
              <li>Past performance does not guarantee future results.</li>
              <li>
                By continuing, you confirm you are of legal age in your
                jurisdiction to trade.
              </li>
            </ul>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <a
              className="text-sm text-white/60 underline decoration-white/20 underline-offset-4 hover:text-white"
              href="#"
              onClick={(e) => e.preventDefault()}
            >
              Learn about trading risk
            </a>

            <button
              onClick={accept}
              className="micro-press rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-black hover:brightness-95 active:brightness-90"
            >
              I understand • Enter
            </button>
          </div>

          <div className="mt-4 text-xs text-white/40">
            This acknowledgment is stored in your browser. Clear site data to
            see this screen again.
          </div>
        </div>
      </div>
    </div>
  );
}
