import { NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-12-15.clover",
});

const resend = new Resend(process.env.RESEND_API_KEY!);

function tierFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";
  return null;
}

function shortItWelcomeHtml(tier: string) {
  const tierLabel =
    tier === "macro"
      ? "Macro (LEVEL III)"
      : tier === "conviction"
      ? "Conviction (LEVEL II)"
      : "Ideas (LEVEL I)";

  return `
  <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;background:#0b0b0f;color:#fff">
    <div style="max-width:640px;margin:0 auto;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;background:rgba(255,255,255,.03)">
      <div style="padding:22px 24px;border-bottom:1px solid rgba(255,255,255,.08)">
        <div style="letter-spacing:.35em;font-size:11px;color:rgba(255,255,255,.45)">SHORT-IT</div>
        <h1 style="margin:10px 0 0;font-size:20px;line-height:1.2">You’re in. ✅</h1>
        <div style="margin-top:6px;color:rgba(255,255,255,.7);font-size:14px">Active plan: <b>${tierLabel}</b></div>
      </div>

      <div style="padding:20px 24px">
        <p style="margin:0 0 14px;color:rgba(255,255,255,.75);font-size:14px;line-height:1.6">
          Your subscription is active. Log in and everything will unlock based on your tier.
        </p>

        <a href="https://short-it.trade/account" target="_blank" rel="noopener"
           style="display:inline-block;background:#fff;color:#000;padding:10px 14px;border-radius:999px;font-weight:700;text-decoration:none;font-size:14px">
          Go to Account
        </a>

        <div style="margin-top:18px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(0,0,0,.25)">
          <div style="font-weight:700;margin-bottom:6px">Quick start</div>
          <ol style="margin:0;padding-left:18px;color:rgba(255,255,255,.75);font-size:14px;line-height:1.6">
            <li>Check <b>Ideas</b> for fresh timestamps</li>
            <li>Use <b>Conviction</b> for setups + reasoning</li>
            <li><b>Macro</b> is the big-picture lens</li>
          </ol>
        </div>

        <p style="margin-top:16px;color:rgba(255,255,255,.55);font-size:12px">
          Need help? Reply to this email.
        </p>
      </div>
    </div>
  </div>`;
}

async function sendShortItEmail(to: string, tier: string) {
  const from = process.env.RESEND_FROM || "Short-It <team@short-it.trade>";
  const subject =
    tier === "macro"
      ? "Macro unlocked — Short-It"
      : tier === "conviction"
      ? "Conviction unlocked — Short-It"
      : "Ideas unlocked — Short-It";

  return resend.emails.send({
    from,
    to,
    subject,
    html: shortItWelcomeHtml(tier),
  });
}

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "Missing webhook secret/signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: any) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err?.message}` },
      { status: 400 }
    );
  }

  try {
    // 1) Checkout completed -> set customer + plan immediately + send email
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = (session.metadata?.userId as string) || null;
      const tier = (session.metadata?.tier as string) || null;

      // ✅ HARD GUARD: only handle Short-It checkouts that include our metadata
      if (!userId || !tier) return NextResponse.json({ received: true });

      const customerId = session.customer?.toString() ?? null;

      await supabaseAdmin
        .from("profiles")
        .update({
          plan: tier,
          stripe_customer_id: customerId,
        })
        .eq("id", userId);

      // Send Short-It email (works even if Stripe doesn't "charge"/no receipt)
      const email =
        session.customer_details?.email ??
        session.customer_email ??
        undefined;

      if (email) {
        await sendShortItEmail(email, tier);
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
        const sub = await stripe.subscriptions.retrieve(subId, { expand: ["items.data.price"] });
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
