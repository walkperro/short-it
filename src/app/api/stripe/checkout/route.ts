import { NextResponse, type NextRequest } from "next/server";
import { stripe } from "@/lib/stripe/stripe";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { getRequestBaseUrl } from "@/lib/server-url";

export const runtime = "nodejs";

const PRICE_BY_TIER: Record<string, string | undefined> = {
  ideas: process.env.STRIPE_PRICE_IDEAS,
  conviction: process.env.STRIPE_PRICE_CONVICTION,
  macro: process.env.STRIPE_PRICE_MACRO,
};

export async function POST(req: NextRequest) {
  const { tier } = await req.json().catch(() => ({}));

  if (!tier || !PRICE_BY_TIER[tier]) {
    return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  // email for receipts
  const { data: profile, error } = await supabaseAdmin
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (await getRequestBaseUrl());

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_collection: "if_required",
    allow_promotion_codes: true,
    customer_email: profile?.email ?? user.email ?? undefined,
    line_items: [{ price: PRICE_BY_TIER[tier]!, quantity: 1 }],
    success_url: `${siteUrl}/account?success=1`,
    cancel_url: `${siteUrl}/subscribe?canceled=1`,
    metadata: {
      userId: user.id,
      tier,
    },
  });

  return NextResponse.json({ url: session.url });
}
