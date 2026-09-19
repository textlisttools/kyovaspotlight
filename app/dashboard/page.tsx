import { supabaseForAdvertiser } from "@/lib/supabase-clerk";
import { SiteHeader } from "@/components/SiteHeader";
import { DashboardClient } from "./DashboardClient";
import type { AdSlotWithCampaign, Lead, Scan } from "@/types/database";

// Server component: reads through the advertiser's own Clerk-scoped
// Supabase client, so RLS (supabase/schema.sql) guarantees this only ever
// sees that advertiser's own ad_slots/scans/leads. middleware.ts already
// requires a signed-in session before this route renders at all.
export default async function DashboardPage() {
  const supabase = await supabaseForAdvertiser();

  const { data: adSlotsData } = await supabase
    .from("ad_slots")
    .select("*, campaign:campaigns(name)")
    .order("created_at", { ascending: false });

  const adSlots = (adSlotsData ?? []) as AdSlotWithCampaign[];
  const adSlotIds = adSlots.map((slot) => slot.id);

  const [scansResult, leadsResult] = adSlotIds.length
    ? await Promise.all([
        supabase.from("scans").select("*").in("ad_slot_id", adSlotIds),
        supabase.from("leads").select("*").in("ad_slot_id", adSlotIds),
      ])
    : [{ data: [] as Scan[] }, { data: [] as Lead[] }];

  return (
    <>
      <SiteHeader />
      <DashboardClient
        adSlots={adSlots}
        scans={(scansResult.data ?? []) as Scan[]}
        leads={(leadsResult.data ?? []) as Lead[]}
      />
    </>
  );
}
