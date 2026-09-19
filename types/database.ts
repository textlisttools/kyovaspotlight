export type AdSlotStatus = "active" | "paused";
export type PaymentStatus = "unclaimed" | "reserved" | "paid";

export type AdSlot = {
  id: string;
  campaign_id: string | null;
  advertiser_id: string | null;
  code: string;
  business_name: string | null;
  destination_url: string | null;
  slot_type: string;
  status: AdSlotStatus;
  payment_status: PaymentStatus;
  stripe_checkout_session_id: string | null;
  created_at: string;
};

export type AdSlotWithCampaign = AdSlot & { campaign: { name: string } | null };

export type CampaignStatus = "open" | "closed";

export type Campaign = {
  id: string;
  name: string;
  slug: string;
  total_slots: number;
  price_cents: number;
  status: CampaignStatus;
  created_at: string;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type Scan = {
  id: string;
  ad_slot_id: string;
  scanned_at: string;
  ip_hash: string | null;
  device_type: DeviceType | null;
  city: string | null;
  region: string | null;
  country: string | null;
};

export type Lead = {
  id: string;
  ad_slot_id: string;
  scan_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
};

export type PushSubscriptionRow = {
  id: string;
  advertiser_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
};
