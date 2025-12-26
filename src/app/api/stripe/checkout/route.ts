import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

export const runtime = "nodejs";

const PRICE_BY_TIER: Record<"ideas" | "conviction" | "macro", string | undefined> = {
  ideas: process.env.STRIPE_PRICE_IDEAS,
  conviction: process.env.STRIPE_PRICE_CONVICTION,
  macro: process.env.STRIPE_PRICE_MACRO,
};

export async function POST(req: NextRequest) {
  const { tier, userId } = await req.json().catch(() => ({} as any));

  if (!tier || !PRICE_BY_TIER[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("email, stripe_customer_id")
    .eq("id", userId)
    .single();

  if (error) {
    return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
  }

  // Ensure stable Stripe customer id for mapping future webhooks
  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile?.email ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;

    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
  }

  const siteUrl = getSiteUrl();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: PRICE_BY_TIER[tier]!, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: `${siteUrl}/account?success=1`,
    cancel_url: `${siteUrl}/subscribe?canceled=1`,
    metadata: { userId, tier },
    // Ensure subscription has userId too (helps but we still support mapping by customer id)
    subscription_data: {
      metadata: { userId, tier },
    },
  });

  return NextResponse.json({ url: session.url });
}
