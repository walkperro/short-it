import Stripe from "stripe";

// Keep this minimal to avoid TS/apiVersion mismatches across Stripe SDK versions.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {});
