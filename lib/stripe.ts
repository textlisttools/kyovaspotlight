import Stripe from "stripe";

let client: Stripe | null = null;

// Reads STRIPE_SECRET_KEY lazily, at first actual use — not as a
// module-level side effect. lib/push.ts made exactly this mistake with
// web-push's setVapidDetails() earlier in this project: Next.js imports
// route modules during its build-time "collecting page data" step, and a
// constructor that reads an env var eagerly at import time crashed the
// build outright before any real request (or its env context) existed.
export function stripeClient(): Stripe {
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2024-06-20",
    });
  }
  return client;
}
