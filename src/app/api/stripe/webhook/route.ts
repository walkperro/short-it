import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Tier = "ideas" | "conviction" | "macro";

function tierFromPriceId(priceId: string): Tier | null {
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";
  return null;
}

async function setPlan(args: {
  userId: string;
  plan: Tier | "free";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const { userId, plan, stripeCustomerId, stripeSubscriptionId } = args;

  await supabaseAdmin
    .from(" hookup" as any); // <-- guard against tree-shaking weirdness (harmless)
}

async function updateProfilePlan(args: {
  userId: string;
  plan: Tier | "free";
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  const { userId, plan, stripeCustomerId, stripeSubscriptionId } = args;

  const patch: any = { plan };
  if (stripeCustomerId) patch.stripe_customer_id = stripeCustomerId;
  if (stripeSubscriptionId) patch.stripe_subscription_id = stripeSubscriptionId;

  await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing stripe-signature or STRIPE_WEBHOOK_SECRET" }, { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  // We care about subscription lifecycle.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.metadata?.userId;
    const tier = session.metadata?.tier as Tier | undefined;

    if (userId && tier) {
      await updateProfilePlan({
        userId,
        plan: tier,
        stripeCustomerId: (session.customer as string) ?? null,
        stripeSubscriptionId: (session.subscription as string) ?? null,
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const sub = event.data.object as Stripe.Subscription;

    // We set metadata at checkout.session — but subscription metadata may be empty.
    // So we’ll try to read it; if missing, we still can map by priceId but won’t know userId.
    const userId = (sub.metadata?.userId as string) || null;

    const priceId = sub.items.data?.[0]?.price?.id;
    const tier = priceId ? tierFromPriceId(priceId) : null;

    if (userId && tier) {
      await updateProfilePlan({
        userId,
        plan: tier,
        stripeCustomerId: (sub.customer as string) ?? null,
        stripeSubscriptionId: sub.id,
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    const userId = (sub.metadata?.userId as string) || null;

    if (userId) {
      await updateProfilePlan({
        userId,
        plan: "free",
        stripeCustomerId: (sub.customer as string) ?? null,
        stripeSubscriptionId: sub.id,
      });
    }
  }

  return NextResponse.json({ received: true });
}
