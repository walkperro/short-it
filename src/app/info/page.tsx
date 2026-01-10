"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function InfoPage() {
  const [tab, setTab] = useState<"about" | "faq" | "contact">("about");

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-white">
      <header className="mb-10">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="mb-2 text-xs tracking-[0.35em] text-white/35"
        >
          INFO
        </motion.div>

        <h1 className="text-3xl font-semibold tracking-tight">
          About · FAQ · Contact
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-white/55">
          One place for how Short-It works, what we publish, and how to reach us.
        </p>

        <div className="mt-6 flex gap-3">
          <TabButton active={tab === "about"} onClick={() => setTab("about")}>
            About
          </TabButton>
          <TabButton active={tab === "faq"} onClick={() => setTab("faq")}>
            FAQ
          </TabButton>
          <TabButton active={tab === "contact"} onClick={() => setTab("contact")}>
            Contact
          </TabButton>
        </div>
      </header>

      {tab === "about" && <About />}
      {tab === "faq" && <FAQ />}
      {tab === "contact" && <Contact />}

      <footer className="mt-16 text-sm text-white/40">
        <Link href="/" className="underline underline-offset-4">
          Back Home
        </Link>
      </footer>
    </main>
  );
}

function TabButton({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-1.5 text-sm transition border border-white/10",
        active
          ? "bg-white text-black"
          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/85",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GlassCard({ title, children }: any) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      {title && <p className="font-semibold text-white/90">{title}</p>}
      <div className="mt-2 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

function About() {
  return (
    <section className="space-y-6 text-[15px] text-white/70">
      <p className="font-semibold text-white/85">Short-It is a trade-intel desk.</p>
      <p>We publish detailed market ideas and context in a simple, timestamped format.</p>
      <p>The goal is not prediction — it’s perspective.</p>
    </section>
  );
}

function FAQ() {
  return (
    <section className="space-y-5">
      <GlassCard title="What is Short-It?">
        Ideas (Level I), Conviction (Level II), Macro (Level III).
      </GlassCard>
      <GlassCard title="Is this financial advice?">
        No. Informational and educational only.
      </GlassCard>
    </section>
  );
}

function Contact() {
  return (
    <section className="space-y-6">
      <GlassCard>
        <div className="space-y-4">
          <div>
            <div className="text-xs tracking-[0.28em] text-white/35">
              CONTACT & SUPPORT
            </div>
            <div className="mt-3 text-white/75">
              short-it.trade@protonmail.com
            </div>
          </div>

          <div className="flex gap-3">
            <SocialIcon href="https://x.com/short_it_trade" label="X" />
            <SocialIcon href="https://instagram.com/short_it.trade" label="IG" />
            <SocialIcon href="https://tiktok.com/@short_it.trade" label="TikTok" />
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

function SocialIcon({ href, label }: any) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
    >
      {label}
    </a>
  );
}
