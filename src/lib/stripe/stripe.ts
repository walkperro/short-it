import Stripe from "stripe";

// NOTE: Do NOT set apiVersion here.
// Let Stripe use the account default to avoid TS type/version mismatches.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // typescript expects a specific string; leaving blank is safest.
});
