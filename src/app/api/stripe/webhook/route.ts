import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

function tierFromPriceId(priceId: string): "ideas" | "conviction" | "macro" | null {
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";
  return null;
}

async function applySubscriptionToUser(args: {
  userId: string;
  customerId?: string | null;
  subscriptionId?: string | null;
  priceId?: string | null;
}) {
  const { userId, customerId, subscriptionId, priceId } = args;

  const plan = priceId ? tierFromPriceId(priceId) : null;
  if (!plan) return;

  await supabaseAdmin
    .from("profiles")
    .update({
      plan,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
    })
    .eq("id", userId);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  // Primary: checkout session completed (reliable metadata)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = (session.metadata as any)?.userId as string | undefined;
    if (!userId) return NextResponse.json({ received: true });

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const customerId = typeof session.customer === "string" ? session.customer : null;

    let priceId: string | null = null;
    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, { expand: ["items.data.price"] });
      priceId = sub.items.data?.[0]?.price?.id ?? null;
    }

    await applySubscriptionToUser({ userId, customerId, subscriptionId, priceId });
    return NextResponse.json({ received: true });
  }

  // Subscription updates/cancels
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;

    // We don't always have metadata here depending on how it was created.
    // If you want this to work 100% for these events, you must ensure subscription metadata is set.
    // For now, we only act if metadata.userId exists.
    const userId = (sub.metadata as any)?.userId as string | undefined;
    if (!userId) return NextResponse.json({ received: true });

    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    const subscriptionId = sub.id;
    const priceId = sub.items.data?.[0]?.price?.id ?? null;

    await applySubscriptionToUser({ userId, customerId, subscriptionId, priceId });
    return NextResponse.json({ received: true });
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = (sub.metadata as any)?.userId as string | undefined;

    // If we don't have userId metadata, we can't map it safely.
    if (!userId) return NextResponse.json({ received: true });

    await supabaseAdmin
      .from("profiles")
      .update({
        plan: "free",
        stripe_subscription_id: null,
      })
      .eq("id", userId);

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
