import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Choose a Short-It plan: Ideas (Level I), Conviction (Level II), Macro (Level III).",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "Short-It Pricing",
    description: "Choose a plan: Ideas, Conviction, Macro.",
    url: "/pricing",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "SHORT-IT — Trade Intel" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Short-It Pricing",
    description: "Choose a plan: Ideas, Conviction, Macro.",
    images: ["/og.png"],
  },
};

export default function PricingPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12 text-white">
      <div className="text-xs tracking-[0.35em] text-white/40">SHORT-IT</div>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-3 text-sm text-white/60">
        Ideas (Level I) → Conviction (Level II) → Macro (Level III).
      </p>

      <div className="mt-8 flex gap-3">
        <Link href="/subscribe" className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black">
          View Plans
        </Link>
        <Link href="/info" className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10">
          Info
        </Link>
      </div>
    </main>
  );
}
