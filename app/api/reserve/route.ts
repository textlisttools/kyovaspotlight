import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase-server";
import { stripeClient } from "@/lib/stripe";

type ReservePayload = {
  ad_slot_id?: string;
  business_name?: string;
  destination_url?: string;
};

// Claims an open ad_slots row and starts a Stripe Checkout session for it.
// middleware.ts already requires a signed-in session to reach this route.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as ReservePayload | null;
  const adSlotId = body?.ad_slot_id?.trim();
  const businessName = body?.business_name?.trim();
  const destinationUrl = body?.destination_url?.trim();

  if (!adSlotId || !businessName || !destinationUrl) {
    return NextResponse.json(
      { error: "ad_slot_id, business_name, and destination_url are all required" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();

  // Conditional update — only succeeds if the slot is still unclaimed, so
  // two people clicking the same open slot at the same moment can't both
  // win it. If no row comes back, someone else got there first.
  const { data: claimedSlot, error: claimError } = await supabase
    .from("ad_slots")
    .update({
      payment_status: "reserved",
      advertiser_id: userId,
      business_name: businessName,
      destination_url: destinationUrl,
    })
    .eq("id", adSlotId)
    .eq("payment_status", "unclaimed")
    .select("id, campaign_id")
    .maybeSingle();

  if (claimError || !claimedSlot) {
    return NextResponse.json(
      { error: "That slot was just claimed by someone else — pick another." },
      { status: 409 }
    );
  }

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("name, price_cents")
    .eq("id", claimedSlot.campaign_id)
    .single();

  if (!campaign) {
    // Shouldn't happen — release the hold rather than leave it stuck.
    await supabase
      .from("ad_slots")
      .update({ payment_status: "unclaimed", advertiser_id: null, business_name: null, destination_url: null })
      .eq("id", adSlotId);
    return NextResponse.json({ error: "Could not find that campaign" }, { status: 500 });
  }

  const origin = request.nextUrl.origin;

  const session = await stripeClient().checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: { name: `Ad slot — ${campaign.name}` },
          unit_amount: campaign.price_cents,
        },
        quantity: 1,
      },
    ],
    metadata: { ad_slot_id: adSlotId },
    success_url: `${origin}/reserve/success?slot=${adSlotId}`,
    cancel_url: `${origin}/reserve?canceled=1`,
  });

  await supabase
    .from("ad_slots")
    .update({ stripe_checkout_session_id: session.id })
    .eq("id", adSlotId);

  return NextResponse.json({ url: session.url });
}
