import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/admin";
import { supabaseAdmin } from "@/lib/supabase-server";

type CreateAdSlotPayload = {
  advertiser_id?: string;
  code?: string;
  business_name?: string;
  destination_url?: string;
  slot_type?: string;
};

const CODE_PATTERN = /^[a-z0-9-]+$/;

// Creates an ad_slots row. Admin-only — middleware.ts already requires a
// signed-in session for /api/admin/*, but "signed in" and "admin" aren't
// the same thing, so this still checks isAdmin() itself before touching
// the service-role client. Without that second check, any advertiser
// could create a slot under someone else's advertiser_id.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!isAdmin(userId)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as CreateAdSlotPayload | null;
  const advertiserId = body?.advertiser_id?.trim();
  const code = body?.code?.trim().toLowerCase();
  const businessName = body?.business_name?.trim();
  const destinationUrl = body?.destination_url?.trim();
  const slotType = body?.slot_type?.trim() || "standard";

  if (!advertiserId || !code || !businessName || !destinationUrl) {
    return NextResponse.json(
      { error: "advertiser_id, code, business_name, and destination_url are all required" },
      { status: 400 }
    );
  }

  if (!CODE_PATTERN.test(code)) {
    return NextResponse.json(
      { error: "code can only contain lowercase letters, numbers, and hyphens" },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("ad_slots")
    .insert({
      advertiser_id: advertiserId,
      code,
      business_name: businessName,
      destination_url: destinationUrl,
      slot_type: slotType,
      status: "active",
      payment_status: "paid",
    })
    .select("*")
    .single();

  if (error) {
    const message = error.code === "23505" ? "That code is already in use" : "Could not create ad slot";
    return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
