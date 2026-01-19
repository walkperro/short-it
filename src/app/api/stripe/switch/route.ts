import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PRICE_BY_TIER: Record<string, string | undefined> = {
  ideas: process.env.STRIPE_PRICE_IDEAS,
  conviction: process.env.STRIPE_PRICE_CONVICTION,
  macro: process.env.STRIPE_PRICE_MACRO,
};

type Tier = "ideas" | "conviction" | "macro";
type DowngradeTiming = "renewal" | "now";

function tierRank(tier: string | null | undefined) {
  if (tier === "ideas") return 1;
  if (tier === "conviction") return 2;
  if (tier === "macro") return 3;
  return 0;
}

function tierFromPriceId(priceId: string | null | undefined) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";
  return null;
}

// Force Stripe to generate + pay proration invoice (triggers receipt email)
async function invoiceNowForProration(subscriptionId: string) {
  const inv = await stripe.invoices.create({
    subscription: subscriptionId,
    pending_invoice_items_behavior: "include",
    auto_advance: true,
  });

  const finalized = await stripe.invoices.finalizeInvoice(inv.id);

  if (
    finalized.status === "paid" ||
    finalized.status === "void" ||
    finalized.status === "uncollectible"
  ) {
    return finalized;
  }

  return await stripe.invoices.pay(finalized.id);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}) as any);
  const tier = body?.tier as Tier | undefined;
  const downgrade_timing: DowngradeTiming =
    body?.downgrade_timing === "now" ? "now" : "renewal";

  if (!tier || !PRICE_BY_TIER[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("id,email,stripe_customer_id,stripe_subscription_id,plan")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Profile lookup failed" },
      { status: 500 },
    );
  }

  let customerId = profile?.stripe_customer_id ?? null;
  const receiptEmail = profile?.email ?? user.email ?? undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: receiptEmail,
      metadata: { userId: user.id },
    });
    customerId = customer.id;

    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  } else if (receiptEmail) {
    await stripe.customers.update(customerId, { email: receiptEmail });
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"],
  });

  const sub = subs.data.find((s) =>
    ["trialing", "active", "past_due", "unpaid"].includes(s.status),
  );

  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription found." },
      { status: 400 },
    );
  }

  const item = sub.items?.data?.[0];
  const itemId = item?.id;
  const currentPriceId = (item?.price as any)?.id;

  if (!itemId || !currentPriceId) {
    return NextResponse.json(
      { error: "Unable to determine current subscription item." },
      { status: 500 },
    );
  }

  const currentTier = tierFromPriceId(currentPriceId);
  const newPriceId = PRICE_BY_TIER[tier]!;
  const upgrading = tierRank(tier) > tierRank(currentTier);
  const downgrading = tierRank(tier) < tierRank(currentTier);

  if (currentPriceId === newPriceId) {
    return NextResponse.json({ ok: true, mode: "no_change", tier });
  }

  // 🔼 Upgrade immediately + send receipt
  if (upgrading) {
    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
      billing_cycle_anchor: "unchanged",
      metadata: { userId: user.id, tier },
    });

    let invoice = null;
    try {
      invoice = await invoiceNowForProration(updated.id);
    } catch (e: any) {
      invoice = { error: e?.message };
    }

    await supabaseAdmin
      .from("profiles")
      .update({ plan: tier, stripe_subscription_id: updated.id })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      mode: "upgrade_now",
      tier,
      invoice,
    });
  }

  // 🔽 Downgrade immediately (manual)
  if (downgrading && downgrade_timing === "now") {
    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "none",
      billing_cycle_anchor: "unchanged",
      metadata: { userId: user.id, tier },
    });

    await supabaseAdmin
      .from("profiles")
      .update({ plan: tier, stripe_subscription_id: updated.id })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      mode: "downgrade_now",
      tier,
    });
  }

  // 🔽 Downgrade at renewal (default)
  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: sub.id,
  });

  const phase0 = schedule.phases?.[0];
  if (!phase0?.start_date || !phase0?.end_date) {
    return NextResponse.json(
      { error: "Unable to schedule downgrade." },
      { status: 500 },
    );
  }

  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: "release",
    phases: [
      {
        start_date: phase0.start_date,
        end_date: phase0.end_date,
        items: phase0.items as any,
      },
      {
        start_date: phase0.end_date,
        items: [{ price: newPriceId, quantity: 1 }],
      },
    ],
    metadata: { userId: user.id, tier },
  });

  return NextResponse.json({
    ok: true,
    mode: "downgrade_at_renewal",
    tier,
    effective_at: phase0.end_date,
  });
}
