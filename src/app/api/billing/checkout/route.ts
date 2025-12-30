import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe/stripe";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Tier = "ideas" | "conviction" | "macro";

function priceIdForTier(tier: Tier): string | null {
  if (tier === "ideas") return process.env.STRIPE_PRICE_IDEAS ?? null;
  if (tier === "conviction") return process.env.STRIPE_PRICE_CONVICTION ?? null;
  if (tier === "macro") return process.env.STRIPE_PRICE_MACRO ?? null;
  return null;
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const tier = (body?.tier ?? "ideas") as Tier;

  const priceId = priceIdForTier(tier);
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing price id env var for tier "${tier}". Set STRIPE_PRICE_IDEAS / STRIPE_PRICE_CONVICTION / STRIPE_PRICE_MACRO.` },
      { status: 400 }
    );
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/account?success=1`,
    cancel_url: `${baseUrl}/subscribe?canceled=1`,
    customer_email: user.email ?? undefined,

    // ✅ store mapping so webhook can always set plan
    metadata: { userId: user.id, tier },

    // ✅ ALSO store it on the subscription itself (helps subscription.updated events)
    subscription_data: {
      metadata: { userId: user.id, tier },
    },
  } as Stripe.Checkout.SessionCreateParams);

  return NextResponse.json({ url: session.url });
}
