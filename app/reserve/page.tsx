import { supabaseAdmin } from "@/lib/supabase-server";
import { SiteHeader } from "@/components/SiteHeader";
import { ReserveClient } from "./ReserveClient";
import type { AdSlot, Campaign } from "@/types/database";

// Public page — anyone can browse slot availability. Claiming one (the
// actual POST to /api/reserve) is what requires a signed-in session;
// ReserveClient handles that gate. Reads with the service-role client
// since this isn't an RLS-scoped advertiser read — same pattern as
// app/r/[code]/page.tsx.
export default async function ReservePage() {
  const supabase = supabaseAdmin();

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!campaign) {
    return (
      <>
        <SiteHeader />
        <main className="section">
          <h1 className="section__title">No open campaign right now</h1>
          <p style={{ textAlign: "center" }}>
            Check back soon, or reach out at{" "}
            <a href="mailto:postcard@kyovaspotlight.com">postcard@kyovaspotlight.com</a>.
          </p>
        </main>
      </>
    );
  }

  const { data: slotsData } = await supabase
    .from("ad_slots")
    .select("*")
    .eq("campaign_id", campaign.id)
    .order("code", { ascending: true });

  return (
    <>
      <SiteHeader />
      <ReserveClient campaign={campaign as Campaign} slots={(slotsData ?? []) as AdSlot[]} />
    </>
  );
}
