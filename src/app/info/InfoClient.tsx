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

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-full px-4 py-1.5 text-sm transition border border-white/10",
        active
          ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.08)]"
          : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white/85",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function GlassCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      {title ? <p className="font-semibold text-white/90">{title}</p> : null}
      <div className="mt-2 text-sm leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

function About() {
  return (
    <section className="space-y-6 text-[15px] text-white/70">
      <p className="font-semibold text-white/85">Short-It is a trade-intel desk.</p>

      <p>
        We publish detailed market ideas and context in a simple, timestamped
        format.
      </p>

      <p>
        Each post is archived and organized to help users track reasoning over
        time and understand how ideas evolve within broader market conditions.
      </p>

      <p className="text-white/75">
        The goal is not prediction — it’s perspective.
      </p>

      <div className="pt-2">
        <div className="text-xs tracking-[0.28em] text-white/35">HOW WE WRITE IDEAS</div>
        <p className="mt-3 text-white/70">
          Every idea follows the same core structure for clarity and ease of review:
        </p>

        <ul className="mt-3 list-disc space-y-2 pl-6 text-white/70">
          <li>Ticker</li>
          <li>Type</li>
          <li>Direction</li>
          <li>Key levels</li>
          <li>Context</li>
        </ul>

        <p className="mt-4 text-white/70">
          This format is designed to make ideas easy to read, reference, and compare
          over time — not to encourage impulsive action.
        </p>

        <p className="mt-3 text-white/70">Ideas are meant to be starting points, not conclusions.</p>
      </div>

      <div className="pt-6">
        <div className="text-xs tracking-[0.28em] text-white/35">
          ABOUT CONVICTION & HIGHER TIERS
        </div>

        <p className="mt-3 text-white/70">
          Conviction and higher tiers are designed to expand perspective.
        </p>

        <p className="mt-3 text-white/70">
          They provide deeper context and broader market framing — helping users
          understand how individual ideas fit into larger market dynamics and supporting
          their own decision-making process.
        </p>

        <p className="mt-3 text-white/70">
          The focus shifts from individual setups to how historical and current
          conditions and narratives interact across the market.
        </p>
      </div>

      <div className="pt-6">
        <div className="text-xs tracking-[0.28em] text-white/35">OUR APPROACH</div>

        <div className="mt-4 space-y-2 text-white/70">
          <p>We don’t sell urgency.</p>
          <p>We don’t sell certainty.</p>
          <p>We don’t sell outcomes.</p>
          <p className="font-semibold text-white/85">We document intel.</p>
        </div>

        <p className="mt-4 text-white/70">
          Short-It is built to support thoughtful analysis, personal risk management,
          and independent judgment.
        </p>

        <p className="mt-3 text-white/70">
          Use this platform as a reference — always do your own research, position sizing,
          and risk assessment.
        </p>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section className="space-y-5">
      <GlassCard title="What is Short-It?">
        Short-It is a trade-intel feed that publishes Ideas (Level I), Conviction writeups
        (Level II), and Macro perspective (Level III).
      </GlassCard>

      <GlassCard title="Is this financial advice?">
        No. Short-It is for informational and educational purposes only and should not be
        considered investment advice.
      </GlassCard>

      <GlassCard title="Why are some items locked?">
        Some sections are member-only based on your plan. Upgrade to access additional
        levels and content.
      </GlassCard>

      <GlassCard title="How often is content updated?">
        Updates vary with market conditions and available setups. Published items appear
        in the feed when ready.
      </GlassCard>

      <GlassCard title="Where can I manage my subscription?">
        Go to the Account page from the user menu to manage your plan and access.
      </GlassCard>

      <GlassCard title="Do you offer an affiliate or referral program?">
        We offer a limited affiliate program for approved partners. If you’re interested
        in referring users to Short-It, contact us directly for details.
      </GlassCard>

      <GlassCard title="Are we missing something?">
        Contact us directly for any other questions.
        <div className="mt-3">
          <Link href="/ideas" className="underline underline-offset-4 text-white/80 hover:text-white">
            Back to Ideas
          </Link>
        </div>
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

            <div className="mt-3 text-white/75">short-it.trade@protonmail.com</div>

            <div className="mt-2 text-sm text-white/50">
              We typically respond within 24–48 hours.
            </div>
          </div>

          <div>
            <div className="text-xs tracking-[0.28em] text-white/35">
              FOLLOW SHORT-IT
            </div>

            <div className="mt-3 flex gap-3">
              <SocialIcon
                href="https://x.com/short_it_trade"
                label="X"
                icon="x"
              />
              <SocialIcon
                href="https://instagram.com/short_it.trade"
                label="Instagram"
                icon="ig"
              />
              <SocialIcon
                href="https://tiktok.com/@short_it.trade"
                label="TikTok"
                icon="tt"
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </section>
  );
}

function SocialIcon({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "x" | "ig" | "tt";
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid h-12 w-12 place-items-center rounded-full border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
    >
      {icon === "x" ? <IconX /> : null}
      {icon === "ig" ? <IconIG /> : null}
      {icon === "tt" ? <IconTikTok /> : null}
    </a>
  );
}

function IconX() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M18.9 2H22l-6.77 7.74L23 22h-6.9l-5.4-6.98L4.6 22H2l7.25-8.3L1 2h7l4.87 6.28L18.9 2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconIG() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M17.5 6.5h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTikTok() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3v10.2a3.8 3.8 0 1 1-3-3.7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 6c1.2 1.7 3 2.8 5 3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
