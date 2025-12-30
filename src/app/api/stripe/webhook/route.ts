import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Tier = "ideas" | "conviction" | "macro";
type Plan = Tier | "free";

function normalizeTier(x: any): Tier | null {
  const v = String(x ?? "").toLowerCase().trim();
  if (v === "ideas") return "ideas";
  if (v === "conviction") return "conviction";
  if (v === "macro") return "macro";
  return null;
}

function tierFromPriceId(priceId: string): Tier | null {
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";
  return null;
}

async function userIdFromCustomerId(customerId: string): Promise<string | undefined> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (error) return undefined;
  return (data?.id as string) ?? undefined;
}

async function applyPlan(args: {
  userId: string;
  plan: Plan;
  customerId?: string | null;
  subscriptionId?: string | null;
}) {
  const { userId, plan, customerId, subscriptionId } = args;

  await supabaseAdmin
    .from("profiles")
    .update({
      plan,
      stripe_customer_id: customerId ?? null,
      stripe_subscription_id: subscriptionId ?? null,
    })
    .eq("id", userId);
}

async function getPriceIdFromSubscription(sub: Stripe.Subscription): Promise<string | null> {
  return sub.items.data?.[0]?.price?.id ?? null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature failed: ${err.message}` },
      { status: 400 }
    );
  }

  // 1) checkout.session.completed (best mapping: has metadata.userId + metadata.tier)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = (session.metadata as any)?.userId as string | undefined;
    const tierMeta = normalizeTier((session.metadata as any)?.tier);
    if (!userId) return NextResponse.json({ received: true });

    const subscriptionId = typeof session.subscription === "string" ? session.subscription : null;
    const customerId = typeof session.customer === "string" ? session.customer : null;

    // Prefer metadata tier (doesn't depend on env vars)
    if (tierMeta) {
      await applyPlan({ userId, plan: tierMeta, customerId, subscriptionId });
      return NextResponse.json({ received: true });
    }

    // Fallback: infer from subscription price id
    if (subscriptionId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId, {
        expand: ["items.data.price"],
      });
      const priceId = sub.items.data?.[0]?.price?.id ?? null;
      if (priceId) {
        const plan = tierFromPriceId(priceId);
        if (plan) await applyPlan({ userId, plan, customerId, subscriptionId });
      }
    }

    return NextResponse.json({ received: true });
  }

  // 2) subscription created/updated
  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated"
  ) {
    const sub = event.data.object as Stripe.Subscription;

    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    if (!customerId) return NextResponse.json({ received: true });

    let userId = (sub.metadata as any)?.userId as string | undefined;
    if (!userId) userId = (await userIdFromCustomerId(customerId)) ?? undefined;
    if (!userId) return NextResponse.json({ received: true });

    const tierMeta = normalizeTier((sub.metadata as any)?.tier);
    if (tierMeta) {
      await applyPlan({ userId, plan: tierMeta, customerId, subscriptionId: sub.id });
      return NextResponse.json({ received: true });
    }

    const priceId = await getPriceIdFromSubscription(sub);
    if (priceId) {
      const plan = tierFromPriceId(priceId);
      if (plan) await applyPlan({ userId, plan, customerId, subscriptionId: sub.id });
    }

    return NextResponse.json({ received: true });
  }

  // 3) subscription deleted
  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;

    const customerId = typeof sub.customer === "string" ? sub.customer : null;
    if (!customerId) return NextResponse.json({ received: true });

    let userId = (sub.metadata as any)?.userId as string | undefined;
    if (!userId) userId = (await userIdFromCustomerId(customerId)) ?? undefined;
    if (!userId) return NextResponse.json({ received: true });

    await applyPlan({ userId, plan: "free", customerId, subscriptionId: null });
    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}
