import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase-server";

type CreateCampaignPayload = {
  name?: string;
  slug?: string;
  total_slots?: number;
  price_dollars?: number;
};

const SLUG_PATTERN = /^[a-z0-9-]+$/;

// Creates a campaign, then bulk-generates its ad_slots rows — one per
// slot, code "<slug>-01".."<slug>-NN", empty and unclaimed until someone
// reserves one from /reserve. Admin-only, same isAdmin() gate as
// app/api/admin/ad-slots/route.ts.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as CreateCampaignPayload | null;
  const name = body?.name?.trim();
  const slug = body?.slug?.trim().toLowerCase();
  const totalSlots = body?.total_slots;
  const priceDollars = body?.price_dollars;

  if (!name || !slug || !totalSlots || !priceDollars) {
    return NextResponse.json(
      { error: "name, slug, total_slots, and price_dollars are all required" },
      { status: 400 }
    );
  }

  if (!SLUG_PATTERN.test(slug)) {
    return NextResponse.json(
      { error: "slug can only contain lowercase letters, numbers, and hyphens" },
      { status: 400 }
    );
  }

  if (!Number.isInteger(totalSlots) || totalSlots < 1 || totalSlots > 200) {
    return NextResponse.json({ error: "total_slots must be a whole number between 1 and 200" }, { status: 400 });
  }

  if (priceDollars <= 0) {
    return NextResponse.json({ error: "price_dollars must be greater than 0" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .insert({
      name,
      slug,
      total_slots: totalSlots,
      price_cents: Math.round(priceDollars * 100),
      status: "open",
    })
    .select("*")
    .single();

  if (campaignError || !campaign) {
    const message = campaignError?.code === "23505" ? "That slug is already in use" : "Could not create campaign";
    return NextResponse.json({ error: message }, { status: campaignError?.code === "23505" ? 409 : 500 });
  }

  const padWidth = String(totalSlots).length < 2 ? 2 : String(totalSlots).length;
  const slotRows = Array.from({ length: totalSlots }, (_, i) => ({
    campaign_id: campaign.id,
    code: `${slug}-${String(i + 1).padStart(padWidth, "0")}`,
    status: "paused" as const,
    payment_status: "unclaimed" as const,
  }));

  const { error: slotsError } = await supabase.from("ad_slots").insert(slotRows);

  if (slotsError) {
    // Roll back the campaign so a failed slot generation doesn't leave an
    // orphaned, empty campaign behind.
    await supabase.from("campaigns").delete().eq("id", campaign.id);
    return NextResponse.json({ error: "Could not create ad slots for campaign" }, { status: 500 });
  }

  return NextResponse.json(campaign, { status: 201 });
}
