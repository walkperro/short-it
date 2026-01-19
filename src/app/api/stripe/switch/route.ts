import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const PRICE_BY_TIER: Record<string, string | undefined> = {
  ideas: process.env.STRIPE_PRICE_IDEAS,
  conviction: process.env.STRIPE_PRICE_CONVICTION,
  macro: process.env.STRIPE_PRICE_MACRO,
};

function tierRank(t: string) {
  return t === "ideas" ? 1 : t === "conviction" ? 2 : t === "macro" ? 3 : 0;
}

export async function POST(req: NextRequest) {
  const { tier } = (await req.json().catch(() => ({}))) as any;

  if (!tier || !PRICE_BY_TIER[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // ✅ Require agreement acceptance (active agreement version)
  const { data: activeAgreement, error: activeErr } = await supabaseAdmin
    .from("active_agreement")
    .select("version")
    .maybeSingle();

  if (activeErr) {
    return NextResponse.json(
      { error: "Agreement lookup failed" },
      { status: 500 },
    );
  }

  const activeVersion = (activeAgreement as any)?.version ?? null;
  if (!activeVersion) {
    return NextResponse.json(
      { error: "No active agreement set" },
      { status: 500 },
    );
  }

  const { data: accepted, error: accErr } = await supabaseAdmin
    .from("agreement_acceptances")
    .select("id")
    .eq("user_id", user.id)
    .eq("agreement_version", activeVersion)
    .maybeSingle();

  if (accErr) {
    return NextResponse.json(
      { error: "Agreement acceptance check failed" },
      { status: 500 },
    );
  }

  if (!accepted) {
    return NextResponse.json(
      {
        error: "Please accept the agreement before purchase.",
        code: "AGREEMENT_REQUIRED",
      },
      { status: 403 },
    );
  }

  // Load customer + current subscription from profiles
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id,stripe_subscription_id,plan")
    .eq("id", user.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json(
      { error: "Profile lookup failed" },
      { status: 500 },
    );
  }

  const customerId = (profile as any)?.stripe_customer_id ?? null;
  if (!customerId) {
    return NextResponse.json(
      { error: "No Stripe customer on file. Start subscription first." },
      { status: 400 },
    );
  }

  // Find the active-ish subscription
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });

  const sub = subs.data.find((s) =>
    ["active", "trialing", "past_due", "unpaid"].includes(s.status),
  );

  if (!sub) {
    return NextResponse.json(
      { error: "No active subscription found." },
      { status: 400 },
    );
  }

  const item = sub.items?.data?.[0];
  const itemId = item?.id;
  const currentPriceId = (item?.price as any)?.id ?? null;

  if (!itemId) {
    return NextResponse.json(
      { error: "Subscription item not found." },
      { status: 500 },
    );
  }

  const newPriceId = PRICE_BY_TIER[tier]!;
  if (currentPriceId === newPriceId) {
    return NextResponse.json({ ok: true, note: "Already on this tier." });
  }

  // Decide proration behavior (upgrade now, downgrade next renewal)
  const currentTier = (profile as any)?.plan ?? "free";
  const upgrading = tierRank(tier) > tierRank(currentTier);

  const updated = await stripe.subscriptions.update(sub.id, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: upgrading ? "create_prorations" : "none",
    // keep billing cycle anchor (don’t reset date)
    billing_cycle_anchor: "unchanged",
    metadata: { userId: user.id, tier },
  });

  // Store latest sub id; plan will be finalized via webhook/sync
  await supabaseAdmin
    .from("profiles")
    .update({
      stripe_subscription_id: updated.id,
      plan: tier, // optimistic; sync/webhook will confirm
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, subscriptionId: updated.id, tier });
}
