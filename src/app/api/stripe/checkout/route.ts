import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe/stripe";

export const runtime = "nodejs";

type Tier = "ideas" | "conviction" | "macro";

const PRICE_BY_TIER: Record<Tier, string | undefined> = {
  ideas: process.env.STRIPE_PRICE_IDEAS,
  conviction: process.env.STRIPE_PRICE_CONVICTION,
  macro: process.env.STRIPE_PRICE_MACRO,
};

export async function POST(req: NextRequest) {
  const { tier, userId } = (await req.json().catch(() => ({}))) as {
    tier?: Tier;
    userId?: string;
  };

  if (!tier || !PRICE_BY_TIER[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  // NOTE: We do NOT depend on profile email here.
  // Stripe will collect email at checkout automatically if needed.

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: PRICE_BY_TIER[tier]!, quantity: 1 }],
    success_url: `${siteUrl}/account?success=1`,
    cancel_url: `${siteUrl}/subscribe?canceled=1`,
    // This is what lets the webhook know WHO bought it.
    metadata: { userId, tier },
  });

  return NextResponse.json({ url: session.url });
}
