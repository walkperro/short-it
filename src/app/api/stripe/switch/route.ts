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

export async function POST(req: NextRequest) {
  const { tier } = await req.json().catch(() => ({}) as any);

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

  // Load profile (customer + cached subscription id if present)
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("id,email,stripe_customer_id,stripe_subscription_id,plan")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json(
      { error: "Profile lookup failed" },
      { status: 500 },
    );
  }

  let customerId = profile?.stripe_customer_id ?? null;
  const receiptEmail = profile?.email ?? user.email ?? undefined;

  // Ensure customer exists
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
  } else {
    if (receiptEmail) {
      await stripe.customers.update(customerId, { email: receiptEmail });
    }
  }

  // Find active-ish subscription
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"],
  });

  const activeLike = subs.data.find((s) =>
    ["trialing", "active", "past_due", "unpaid"].includes(s.status),
  );

  if (!activeLike) {
    return NextResponse.json(
      { error: "No active subscription found to switch." },
      { status: 400 },
    );
  }

  const sub = activeLike;
  const item = sub.items?.data?.[0];
  const itemId = item?.id ?? null;
  const currentPriceId = (item?.price as any)?.id ?? null;

  if (!itemId || !currentPriceId) {
    return NextResponse.json(
      { error: "Could not determine current subscription item/price." },
      { status: 500 },
    );
  }

  const currentTier = tierFromPriceId(currentPriceId);
  const newPriceId = PRICE_BY_TIER[tier]!;
  const upgrading = tierRank(tier) > tierRank(currentTier);

  // If already on that price, no-op (still sync profile)
  if (currentPriceId === newPriceId) {
    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_subscription_id: sub.id,
        plan: tier,
      })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      mode: "no_change",
      tier,
      subscriptionId: sub.id,
    });
  }

  // ✅ Upgrades: apply immediately with proration (charge/credit now)
  if (upgrading) {
    const updated = await stripe.subscriptions.update(sub.id, {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: "create_prorations",
      billing_cycle_anchor: "unchanged",
      metadata: { userId: user.id, tier },
    });

    await supabaseAdmin
      .from("profiles")
      .update({
        stripe_subscription_id: updated.id,
        plan: tier,
      })
      .eq("id", user.id);

    return NextResponse.json({
      ok: true,
      mode: "upgrade_now",
      tier,
      subscriptionId: updated.id,
    });
  }

  // ✅ Downgrades: schedule at period end (keep access until renewal)
  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: sub.id,
  });

  const phase0 = schedule.phases?.[0];
  const start = phase0?.start_date ?? null;
  const end = phase0?.end_date ?? null;

  if (!start || !end) {
    return NextResponse.json(
      {
        error:
          "Could not determine current period end for downgrade scheduling.",
      },
      { status: 500 },
    );
  }

  const updatedSchedule = await stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: "release",
      phases: [
        // Keep current plan until period end
        {
          start_date: start,
          end_date: end,
          items: (phase0?.items as any) ?? [
            { price: currentPriceId, quantity: 1 },
          ],
        },
        // Switch to cheaper plan at renewal
        {
          start_date: end,
          items: [{ price: newPriceId, quantity: 1 }],
        },
      ],
      metadata: { userId: user.id, tier },
    },
  );

  // Keep plan unchanged for now; your webhook/sync will flip it after renewal.
  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_subscription_id: sub.id,
    })
    .eq("id", user.id);

  return NextResponse.json({
    ok: true,
    mode: "downgrade_at_renewal",
    tier,
    subscriptionId: sub.id,
    scheduleId: updatedSchedule.id,
    effective_at: end,
  });
}
