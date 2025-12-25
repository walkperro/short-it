"use client";

const STRIPE_LINKS = {
  ideas: "https://buy.stripe.com/REPLACE_IDEAS_LINK",
  conviction: "https://buy.stripe.com/REPLACE_CONVICTION_LINK",
  macro: "https://buy.stripe.com/REPLACE_MACRO_LINK",
};

export default function SubscribePage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold">Subscribe</h1>
      <p className="mt-2 text-sm text-black/70">
        Choose your access level. Upgrade anytime.
      </p>

      <div className="mt-6 grid gap-4">
        <Tier
          title="Ideas (LEVEL I)"
          price="$29.99 / month"
          desc="3–4 curated trade ideas with targets and timeframes."
          href={STRIPE_LINKS.ideas}
        />
        <Tier
          title="Conviction (LEVEL II)"
          price="$79.99 / month"
          desc="Technical and fundamental reasoning behind each idea."
          href={STRIPE_LINKS.conviction}
        />
        <Tier
          title="Macro (LEVEL III)"
          price="$199.99 / month"
          desc="Macro regime, sector allocation, and cycle-level context."
          href={STRIPE_LINKS.macro}
        />
      </div>

      <p className="mt-6 text-xs text-black/50">
        Taxes calculated at checkout.
      </p>
    </main>
  );
}

function Tier({ title, price, desc, href }: any) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-black/60">{price}</div>
      </div>
      <p className="mt-2 text-sm text-black/70">{desc}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block rounded-2xl bg-black text-white px-4 py-2 text-sm"
      >
        Subscribe
      </a>
    </div>
  );
}
