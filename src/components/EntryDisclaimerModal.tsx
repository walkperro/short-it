"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "shortit_disclaimer_accepted_v1";

export default function EntryDisclaimerModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      const ok = localStorage.getItem(STORAGE_KEY) === "1";
      setOpen(!ok);
    } catch {
      setOpen(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-full max-w-xl rounded-3xl border border-white/10 bg-[#0B0B0B] p-6 text-white shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs tracking-widest text-white/60">DISCLAIMER</div>
                <h2 className="mt-1 text-2xl font-semibold">Not financial advice.</h2>
                <p className="mt-2 text-sm text-white/70">
                  SHORT-IT provides market commentary for educational purposes only.
                  Trading involves risk, including total loss. You’re responsible for your decisions.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
                18+ only
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>• Educational content — not individualized advice.</li>
              <li>• Past performance is not indicative of future results.</li>
              <li>• By entering, you confirm you’re of legal age to trade in your jurisdiction.</li>
            </ul>

            <div className="mt-6 flex items-center justify-between gap-3">
              <span className="text-xs text-white/50">
                (We’ll add the bear image later.)
              </span>

              <motion.button
                onClick={accept}
                className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-black"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.span
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: [0.9, 1, 0.9] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  Enter
                </motion.span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
