"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import type { AdSlot, Campaign } from "@/types/database";
import type { AdvertiserOption } from "./page";

type AdminClientProps = {
  adSlots: AdSlot[];
  campaigns: Campaign[];
  advertisers: AdvertiserOption[];
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

export function AdminClient({ adSlots, campaigns, advertisers }: AdminClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [campaignError, setCampaignError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/admin/ad-slots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        advertiser_id: data.get("advertiser_id"),
        code: data.get("code"),
        business_name: data.get("business_name"),
        destination_url: data.get("destination_url"),
        slot_type: data.get("slot_type"),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong");
      setStatus("error");
      return;
    }

    form.reset();
    setStatus("idle");
    router.refresh();
  }

  async function handleCampaignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCampaignStatus("submitting");
    setCampaignError(null);

    const form = event.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        slug: data.get("slug"),
        total_slots: Number(data.get("total_slots")),
        price_dollars: Number(data.get("price_dollars")),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setCampaignError(body.error ?? "Something went wrong");
      setCampaignStatus("error");
      return;
    }

    form.reset();
    setCampaignStatus("idle");
    router.refresh();
  }

  async function downloadQr(code: string) {
    const url = `${window.location.origin}/r/${code}`;
    const dataUrl = await QRCode.toDataURL(url, { width: 512, margin: 2 });
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${code}-qr.png`;
    link.click();
  }

  return (
    <main className="admin">
      <h1>Campaigns</h1>
      <p className="admin__hint">
        Creating a campaign generates all of its ad slots at once, empty and unclaimed — advertisers
        reserve and pay for one at{" "}
        <a href="/reserve" target="_blank" rel="noreferrer">
          /reserve
        </a>
        .
      </p>

      <form className="admin-form" onSubmit={handleCampaignSubmit}>
        <label>
          Campaign name
          <input name="name" type="text" required placeholder="November 2026 — Huntington, WV" />
        </label>

        <label>
          Slug (used in QR codes)
          <input
            name="slug"
            type="text"
            required
            pattern="[a-z0-9-]+"
            placeholder="huntington-nov26"
            title="Lowercase letters, numbers, and hyphens only"
          />
        </label>

        <label>
          Total slots
          <input name="total_slots" type="number" required min={1} max={200} placeholder="16" />
        </label>

        <label>
          Price per slot ($)
          <input name="price_dollars" type="number" required min={1} step="0.01" placeholder="500" />
        </label>

        <button type="submit" disabled={campaignStatus === "submitting"}>
          {campaignStatus === "submitting" ? "Creating…" : "Create campaign"}
        </button>
        {campaignError && <p className="opt-in-form__error">{campaignError}</p>}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Campaign</th>
            <th>Price</th>
            <th>Claimed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((campaign) => {
            const claimed = adSlots.filter(
              (slot) => slot.campaign_id === campaign.id && slot.payment_status !== "unclaimed"
            ).length;
            return (
              <tr key={campaign.id}>
                <td>{campaign.name}</td>
                <td>{formatPrice(campaign.price_cents)}</td>
                <td>
                  {claimed} / {campaign.total_slots}
                </td>
                <td>{campaign.status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <h1>Ad slots</h1>

      <form className="admin-form" onSubmit={handleSubmit}>
        <label>
          Advertiser
          <select name="advertiser_id" required defaultValue="">
            <option value="" disabled>
              Select an advertiser
            </option>
            {advertisers.map((advertiser) => (
              <option key={advertiser.id} value={advertiser.id}>
                {advertiser.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Business name
          <input name="business_name" type="text" required placeholder="Joe's Diner" />
        </label>

        <label>
          Code
          <input
            name="code"
            type="text"
            required
            pattern="[a-z0-9-]+"
            placeholder="joes-diner"
            title="Lowercase letters, numbers, and hyphens only"
          />
        </label>

        <label>
          Destination URL
          <input
            name="destination_url"
            type="text"
            required
            placeholder="https://joesdiner.com"
          />
        </label>

        <label>
          Slot type
          <select name="slot_type" defaultValue="standard">
            <option value="standard">Standard</option>
            <option value="featured">Featured</option>
          </select>
        </label>

        <button type="submit" disabled={status === "submitting"}>
          {status === "submitting" ? "Creating…" : "Create ad slot"}
        </button>
        {error && <p className="opt-in-form__error">{error}</p>}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Business</th>
            <th>Code</th>
            <th>Destination</th>
            <th>Status</th>
            <th>Payment</th>
            <th>QR code</th>
          </tr>
        </thead>
        <tbody>
          {adSlots.map((slot) => (
            <tr key={slot.id}>
              <td>{slot.business_name ?? "—"}</td>
              <td>
                <code>{slot.code}</code>
              </td>
              <td>{slot.destination_url ?? "—"}</td>
              <td>{slot.status}</td>
              <td>{slot.payment_status}</td>
              <td>
                <button type="button" onClick={() => downloadQr(slot.code)}>
                  Download
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
