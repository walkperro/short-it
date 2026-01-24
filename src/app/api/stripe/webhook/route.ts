import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase/server";
import { sendShortItAccessEmail } from "@/lib/email/shortit";
import { sendGAEvent } from "@/lib/analytics/ga";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

function tierFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";
  return null;
}

function tierRank(tier: string | null) {
  if (tier === "ideas") return 1;
  if (tier === "conviction") return 2;
  if (tier === "macro") return 3;
  return 0;
}

function levelFromTier(tier: string) {
  if (tier === "macro") return "LEVEL III";
  if (tier === "conviction") return "LEVEL II";
  return "LEVEL I";
}

function planLabel(tier: string) {
  if (tier === "macro") return "Macro";
  if (tier === "conviction") return "Conviction";
  return "Ideas";
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Missing webhook secret/signature" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message}` },
      { status: 400 },
    );
  }

  try {
    // 1) Checkout completed -> set plan immediately + send Short-It email
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // ✅ IMPORTANT: we rely on session.metadata (set by checkout route)
      const userId = (session.metadata?.userId as string) || null;
      const tier = (session.metadata?.tier as string) || null;
      if (!userId || !tier) return NextResponse.json({ received: true });

      const customerId = session.customer?.toString() ?? null;

      await supabaseAdmin
        .from("profiles")
        .update({
          plan: tier,
          stripe_customer_id: customerId,
        })
        .eq("id", userId);

      // Email target: try session fields, else fetch Stripe customer email
      let email =
        session.customer_details?.email ??
        (session.customer_email as string | null) ??
        null;

      if (!email && customerId) {
        const c = await stripe.customers.retrieve(customerId);
        if (!("deleted" in c) && c.email) email = c.email;
      }

      if (email) {
        await sendShortItAccessEmail({
          email,
          plan: planLabel(tier),
          level: levelFromTier(tier),
          dashboardUrl: "https://short-it.trade/account",
          billingUrl: "https://short-it.trade/account",
        });
      }

      // ✅ GA event (non-blocking)
      if (customerId) {
        await sendGAEvent({
          clientId: customerId,
          name: "subscription_created",
          params: {
            tier,
            plan_label: planLabel(tier),
            event_source: "checkout.session.completed",
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    // 2) Subscription events -> update by customer id (keeps plan in sync)
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
            plan:
              event.type === "customer.subscription.deleted"
                ? "free"
                : (tier ?? "free"),
          })
          .eq("stripe_customer_id", customerId);
      }

      // ✅ GA events (non-blocking)
      try {
        if (customerId) {
          if (event.type === "customer.subscription.created") {
            await sendGAEvent({
              clientId: customerId,
              name: "subscription_created",
              params: {
                tier: tier ?? "unknown",
                event_source: "customer.subscription.created",
              },
            });
          }

          if (event.type === "customer.subscription.deleted") {
            await sendGAEvent({
              clientId: customerId,
              name: "subscription_canceled",
              params: { event_source: "customer.subscription.deleted" },
            });
          }

          if (event.type === "customer.subscription.updated") {
            // Detect upgrade/downgrade based on previous_attributes (if price changed)
            const prev = (event.data as any)?.previous_attributes ?? null;

            const prevPriceId =
              prev?.items?.data?.[0]?.price?.id ??
              prev?.items?.data?.[0]?.price ??
              null;

            const prevTier = tierFromPriceId(prevPriceId);
            const newTier = tier;

            if (prevTier && newTier && prevTier !== newTier) {
              const upgrading = tierRank(newTier) > tierRank(prevTier);
              await sendGAEvent({
                clientId: customerId,
                name: upgrading
                  ? "subscription_upgraded"
                  : "subscription_downgraded",
                params: {
                  from_tier: prevTier,
                  to_tier: newTier,
                  subscription_id: sub.id,
                  event_source: "customer.subscription.updated",
                },
              });
            } else {
              // Generic update (status changes, etc.)
              await sendGAEvent({
                clientId: customerId,
                name: "subscription_updated",
                params: {
                  tier: newTier ?? "unknown",
                  status: sub.status,
                  subscription_id: sub.id,
                  event_source: "customer.subscription.updated",
                },
              });
            }
          }
        }
      } catch {
        // swallow
      }

      return NextResponse.json({ received: true });
    }

    // 3) Invoice paid -> keep plan in sync (some $0 invoices won't trigger Stripe receipts)
    if (event.type === "invoice.payment_succeeded") {
      const invoice = event.data.object as Stripe.Invoice;

      const customerId = invoice.customer?.toString() ?? null;
      const subId =
        ((invoice as any).subscription ?? null)?.toString?.() ?? null;

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

      // ✅ GA renewal/revenue signal
      if (customerId) {
        await sendGAEvent({
          clientId: customerId,
          name: "invoice_paid",
          params: {
            tier: tier ?? "unknown",
            subscription_id: subId ?? undefined,
            invoice_id: invoice.id,
            amount_paid: (invoice.amount_paid ?? 0) / 100,
            currency: invoice.currency ?? undefined,
            event_source: "invoice.payment_succeeded",
          },
        });
      }

      return NextResponse.json({ received: true });
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message ?? "Webhook handler failed" },
      { status: 500 },
    );
  }
}
