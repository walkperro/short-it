import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // Do NOT hardcode apiVersion unless you are sure it matches the Stripe SDK typing.
});
