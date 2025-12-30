import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const PRICE_TO_TIER: Record<string, "ideas" | "conviction" | "macro"> = {
  [process.env.STRIPE_PRICE_IDEAS || ""]: "ideas",
  [process.env.STRIPE_PRICE_CONVICTION || ""]: "conviction",
  [process.env.STRIPE_PRICE_MACRO || ""]: "macro",
};

function tierRank(t: "ideas" | "conviction" | "macro") {
  return t === "ideas" ? 1 : t === "conviction" ? 2 : 3;
}

export async function POST(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const email = (user.email || "").toLowerCase().trim();

  // Load profile stripe ids
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id,stripe_subscription_id,plan")
    .eq("id", user.id)
    .maybeSingle();

  let customerId = profile?.stripe_customer_id ?? null;

  // If missing customer id, try find by email
  if (!customerId && email) {
    const existing = await stripe.customers.list({ email, limit: 1 });
    customerId = existing.data[0]?.id ?? null;
  }

  // If still missing, nothing to sync (user may not have purchased)
  if (!customerId) {
    return NextResponse.json({ ok: true, plan: profile?.plan ?? "free", reason: "no_customer" });
  }

  // Pull subs
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 20,
    expand: ["data.items.data.price"],
  });

  // Consider active-ish states
  const live = subs.data.filter((s) =>
    ["active", "trialing", "past_due"].includes(s.status)
  );

  // Determine best tier from price ids
  let bestTier: "ideas" | "conviction" | "macro" | null = null;
  let bestSubId: string | null = null;

  for (const sub of live) {
    for (const item of sub.items.data) {
      const priceId = (item.price as any)?.id as string | undefined;
      if (!priceId) continue;
      const tier = PRICE_TO_TIER[priceId];
      if (!tier) continue;

      if (!bestTier || tierRank(tier) > tierRank(bestTier)) {
        bestTier = tier;
        bestSubId = sub.id;
      }
    }
  }

  // Update profile
  const nextPlan = bestTier ?? "free";

  await supabaseAdmin
    .from("profiles")
    .upsert({
      id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: bestSubId,
      plan: nextPlan,
      updated_at: new Date().toISOString(),
    });

  return NextResponse.json({ ok: true, plan: nextPlan, stripe_customer_id: customerId, stripe_subscription_id: bestSubId });
}
