import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // If this ever causes a build error, remove this line and redeploy.});
