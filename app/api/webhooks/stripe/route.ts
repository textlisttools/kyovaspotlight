import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-server";
import { stripeClient } from "@/lib/stripe";

// Called by Stripe directly — never by a browser with a Clerk session, so
// this route is deliberately left out of middleware.ts's protected list.
// Signature verification (not a Clerk session) is what proves a request
// actually came from Stripe.
export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const adSlotId = session.metadata?.ad_slot_id;
    if (adSlotId) {
      await supabase
        .from("ad_slots")
        .update({ payment_status: "paid", status: "active" })
        .eq("id", adSlotId)
        .eq("stripe_checkout_session_id", session.id);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const adSlotId = session.metadata?.ad_slot_id;
    if (adSlotId) {
      // Release an abandoned reservation back to the pool — only if it
      // never actually got paid (a completed event could in theory be
      // processed after an expired one arrives late).
      await supabase
        .from("ad_slots")
        .update({
          payment_status: "unclaimed",
          advertiser_id: null,
          business_name: null,
          destination_url: null,
          stripe_checkout_session_id: null,
        })
        .eq("id", adSlotId)
        .eq("stripe_checkout_session_id", session.id)
        .eq("payment_status", "reserved");
    }
  }

  return NextResponse.json({ received: true });
}
