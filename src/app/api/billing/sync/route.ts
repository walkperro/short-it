import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Let the installed stripe types decide; avoids TS apiVersion mismatches.
});

function tierFromPriceId(priceId?: string | null) {
  if (!priceId) return null;
  if (priceId === process.env.STRIPE_PRICE_IDEAS) return "ideas";
  if (priceId === process.env.STRIPE_PRICE_CONVICTION) return "conviction";
  if (priceId === process.env.STRIPE_PRICE_MACRO) return "macro";
  return null;
}

// Highest tier wins if multiple subs exist
function maxTier(a: string | null, b: string | null) {
  const rank: Record<string, number> = { free: 0, ideas: 1, conviction: 2, macro: 3, admin: 99 };
  const aa = a ?? "free";
  const bb = b ?? "free";
  return rank[bb] > rank[aa] ? bb : aa;
}

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const email = user.email ?? null;

  // Read current profile
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id,plan,stripe_customer_id,stripe_subscription_id,email")
    .eq("id", user.id)
    .maybeSingle();

  // Find Stripe customer
  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 5 });
    customerId = customers.data?.[0]?.id ?? null;
  }

  if (!customerId) {
    // Nothing to restore, keep as-is
    return NextResponse.json({ ok: true, plan: profile?.plan ?? "free", customerId: null });
  }

  // Pull subscriptions (include inactive, we’ll filter)
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"],
  });

  let bestTier: string | null = null;
  let bestSubId: string | null = null;

  for (const sub of subs.data) {
    // Treat these as “has access”
    const okStatus = ["trialing", "active", "past_due", "unpaid"].includes(sub.status);
    if (!okStatus) continue;

    const priceId = (sub.items?.data?.[0]?.price as any)?.id ?? null;
    const tier = tierFromPriceId(priceId);
    if (!tier) continue;

    bestTier = maxTier(bestTier, tier);
    bestSubId = sub.id;
  }

  const finalPlan = bestTier ?? "free";

  await supabaseAdmin
    .from("profiles")
    .update({
      plan: finalPlan,
      stripe_customer_id: customerId,
      stripe_subscription_id: bestSubId,
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, plan: finalPlan, customerId, subscriptionId: bestSubId });
}
