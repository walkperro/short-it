import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

function tierFromPriceId(priceId?: string | null) {
  if (!priceId) return null;

  // ✅ MUST match the env vars used by checkout
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";

  return null;
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Missing webhook secret/signature" }, { status: 400 });

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook signature verification failed: ${err?.message}` }, { status: 400 });
  }

  try {
    // 1) Checkout completed -> set customer + plan immediately
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = (session.metadata?.userId as string) || null;
      const tier = (session.metadata?.tier as string) || null;

      if (userId && tier) {
        await supabaseAdmin
          .from("profiles")
          .update({
            plan: tier,
            stripe_customer_id: session.customer?.toString() ?? null,
          })
          .eq("id", userId);
      }

      return NextResponse.json({ received: true });
    }

    // 2) Subscription events -> update by customer id
    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const sub = event.data.object as Stripe.Subscription;

      const customerId = sub.customer?.toString() ?? null;
      const priceId = sub.items?.data?.[0]?.price?.id ?? null;
      const tier = tierFromPriceId(priceId);

      if (customerId) {
        await supabaseAdmin
          .from("profiles")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: sub.id,
            plan: event.type === "customer.subscription.deleted" ? "free" : (tier ?? "free"),
          })
          .eq("stripe_customer_id", customerId);
      }

      return NextResponse.json({ received: true });
    }

    // 3) Invoice paid -> keep plan in sync
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      const customerId = invoice.customer?.toString() ?? null;
      const subId = (((invoice as any).subscription) ?? null)?.toString?.() ?? null;
      let priceId: string | null = null;
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ["items.data.price"],
        });
        priceId = (sub.items.data[0]?.price as any)?.id ?? null;
      }
      const tier = tierFromPriceId(priceId);

      if (customerId && tier) {
        await supabaseAdmin
          .from("profiles")
          .update({ plan: tier, stripe_customer_id: customerId })
          .eq("stripe_customer_id", customerId);
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Webhook handler failed" }, { status: 500 });
  }
}
