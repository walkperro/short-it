import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";
import { getRequestBaseUrl } from "@/lib/server-url";

export const runtime = "nodejs";

const PRICE_BY_TIER: Record<string, string | undefined> = {
  ideas: process.env.STRIPE_PRICE_IDEAS,
  conviction: process.env.STRIPE_PRICE_CONVICTION,
  macro: process.env.STRIPE_PRICE_MACRO,
};

export async function POST(req: NextRequest) {
  const { tier } = await req.json().catch(() => ({}) as any);

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

  // Pull email + stripe_customer_id from profiles
  const { data: profile, error: profErr } = await supabaseAdmin
    .from("profiles")
    .select("email,stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (profErr) {
    return NextResponse.json(
      { error: "Profile lookup failed" },
      { status: 500 },
    );
  }

  const receiptEmail = (profile as any)?.email ?? user.email ?? undefined;
  let customerId = (profile as any)?.stripe_customer_id ?? null;

  // Ensure Stripe customer exists
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
    // keep email updated for receipts
    if (receiptEmail) {
      await stripe.customers.update(customerId, { email: receiptEmail });
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || (await getRequestBaseUrl());

  // Prevent multiple subscriptions: if any active-ish sub exists, send to Billing Portal
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const hasActive = subs.data.some((sub) =>
    ["active", "trialing", "past_due", "unpaid"].includes(sub.status),
  );

  if (hasActive) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl}/account`,
    });

    return NextResponse.json({
      url: portal.url,
      note: "Existing subscription found — sent to Billing Portal for upgrade/downgrade.",
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    allow_promotion_codes: true,
    consent_collection: { terms_of_service: "required" },
    payment_method_collection: "if_required",
    customer: customerId,
    line_items: [{ price: PRICE_BY_TIER[tier]!, quantity: 1 }],
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
    metadata: { userId: user.id, tier },
    success_url: `${siteUrl}/account?success=1`,
    cancel_url: `${siteUrl}/subscribe?canceled=1`,
  });

  return NextResponse.json({ url: session.url });
}
