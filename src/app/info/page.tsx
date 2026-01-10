"use client";

import { useState } from "react";
import Link from "next/link";

export default function InfoPage() {
  const [tab, setTab] = useState<"about" | "faq" | "contact">("about");

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10 text-white">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">
          About · FAQ · Contact
        </h1>
        <p className="mt-2 text-sm text-white/60">
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

      <footer className="mt-16 text-sm text-white/50">
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
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm transition ${
        active
          ? "bg-white text-black"
          : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

function About() {
  return (
    <section className="space-y-6">
      <p>
        <strong>Short-It</strong> is a trade-intel desk.
      </p>

      <p>
        We publish detailed market ideas and context in a simple, timestamped
        format.
      </p>

      <p>
        Each post is archived and organized to help users track reasoning over
        time and understand how ideas evolve within broader market conditions.
      </p>

      <p>
        The goal is not prediction — it’s perspective.
      </p>

      <p>
        Short-It exists to give users a clear way to view ideas within a broader
        market lens, with detailed analysis and clear framing.
      </p>

      <h3 className="pt-6 text-sm font-semibold uppercase tracking-wide text-white/50">
        How we write ideas
      </h3>

      <ul className="list-disc space-y-2 pl-5 text-white/80">
        <li>Ticker</li>
        <li>Type</li>
        <li>Direction</li>
        <li>Key levels</li>
        <li>Context</li>
      </ul>

      <p>
        This format is designed to make ideas easy to read, reference, and
        compare over time — not to encourage impulsive action.
      </p>

      <p>
        Ideas are meant to be starting points, not conclusions.
      </p>

      <h3 className="pt-6 text-sm font-semibold uppercase tracking-wide text-white/50">
        About conviction & higher tiers
      </h3>

      <p>
        Conviction and higher tiers are designed to expand perspective.
      </p>

      <p>
        They provide deeper context and broader market framing — helping users
        understand how individual ideas fit into larger market dynamics and
        supporting their own decision-making process.
      </p>

      <p>
        The focus shifts from individual setups to how historical and current
        conditions and narratives interact across the market.
      </p>

      <h3 className="pt-6 text-sm font-semibold uppercase tracking-wide text-white/50">
        Our approach
      </h3>

      <p>We don’t sell urgency.</p>
      <p>We don’t sell certainty.</p>
      <p>We don’t sell outcomes.</p>

      <p className="font-semibold">We document intel.</p>

      <p>
        Short-It is built to support thoughtful analysis, personal risk
        management, and independent judgment.
      </p>

      <p>
        Use this platform as a reference — always do your own research, position
        sizing, and risk assessment.
      </p>
    </section>
  );
}

function FAQ() {
  return (
    <section className="space-y-6">
      <Card
        q="What is Short-It?"
        a="Short-It is a trade-intel feed that publishes Ideas (Level I), Conviction writeups (Level II), and Macro perspective (Level III)."
      />
      <Card
        q="Is this financial advice?"
        a="No. Short-It is for informational and educational purposes only and should not be considered investment advice."
      />
      <Card
        q="Why are some items locked?"
        a="Some sections are member-only based on your plan. Upgrade to access additional levels and content."
      />
      <Card
        q="How often is content updated?"
        a="Updates vary with market conditions and available setups. Published items appear in the feed when ready."
      />
      <Card
        q="Where can I manage my subscription?"
        a="Go to the Account page from the user menu to manage your plan and access."
      />
      <Card
        q="Do you offer an affiliate or referral program?"
        a="We offer a limited affiliate program for approved partners. If you're interested in referring users to Short-It, contact us directly for details."
      />
      <Card
        q="Are we missing something?"
        a={
          <>
            Contact us directly for any other questions.
            <br />
            <Link href="/" className="mt-2 inline-block underline">
              Back to Ideas
            </Link>
          </>
        }
      />
    </section>
  );
}

function Contact() {
  return (
    <section className="space-y-6">
      <p className="font-medium">Contact & Support</p>

      <p className="text-white/80">short-it.trade@protonmail.com</p>

      <p className="text-sm text-white/60">
        We typically respond within 24–48 hours.
      </p>

      <div className="pt-4">
        <p className="mb-2 text-sm uppercase tracking-wide text-white/50">
          Follow Short-It
        </p>

        <div className="flex gap-4">
          <a href="#" className="rounded-full bg-white/10 p-3">
            X
          </a>
          <a href="#" className="rounded-full bg-white/10 p-3">
            IG
          </a>
          <a href="#" className="rounded-full bg-white/10 p-3">
            TikTok
          </a>
        </div>
      </div>
    </section>
  );
}

function Card({ q, a }: { q: string; a: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 p-5">
      <p className="font-medium">{q}</p>
      <p className="mt-2 text-sm text-white/80">{a}</p>
    </div>
  );
}
