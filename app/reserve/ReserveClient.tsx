"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import type { AdSlot, Campaign } from "@/types/database";

type ReserveClientProps = {
  campaign: Campaign;
  slots: AdSlot[];
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toLocaleString()}`;
}

export function ReserveClient({ campaign, slots }: ReserveClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const available = slots.filter((slot) => slot.payment_status === "unclaimed").length;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId) return;

    setStatus("submitting");
    setError(null);

    const form = new FormData(event.currentTarget);

    const res = await fetch("/api/reserve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ad_slot_id: selectedId,
        business_name: form.get("business_name"),
        destination_url: form.get("destination_url"),
      }),
    });

    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      setStatus("error");
      setError(body.error ?? "Something went wrong");
      router.refresh();
      return;
    }

    window.location.href = body.url;
  }

  return (
    <main className="reserve">
      <div className="reserve__header">
        <h1>{campaign.name}</h1>
        <p>
          {formatPrice(campaign.price_cents)} per slot · {available} of {campaign.total_slots} available
        </p>
      </div>

      <div className="reserve__grid">
        {slots.map((slot) => {
          const isAvailable = slot.payment_status === "unclaimed";
          const isSelected = selectedId === slot.id;
          return (
            <button
              key={slot.id}
              type="button"
              className={`reserve__slot reserve__slot--${slot.payment_status}${isSelected ? " reserve__slot--selected" : ""}`}
              disabled={!isAvailable}
              onClick={() => setSelectedId(isSelected ? null : slot.id)}
            >
              <span className="reserve__slot-code">{slot.code}</span>
              <span className="reserve__slot-status">
                {slot.payment_status === "unclaimed" && "Available"}
                {slot.payment_status === "reserved" && "Pending payment"}
                {slot.payment_status === "paid" && "Claimed"}
              </span>
              {isAvailable && <span className="reserve__slot-price">{formatPrice(campaign.price_cents)}</span>}
            </button>
          );
        })}
      </div>

      {selectedId && (
        <div className="reserve__form-panel">
          <SignedOut>
            <p>Sign in to reserve this slot.</p>
            <SignInButton mode="modal" forceRedirectUrl="/reserve">
              <button>Sign in to continue</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <form className="opt-in-form" onSubmit={handleSubmit}>
              <h3>Reserve {slots.find((s) => s.id === selectedId)?.code}</h3>
              <input name="business_name" type="text" placeholder="Business name" required />
              <input
                name="destination_url"
                type="text"
                placeholder="Your website (https://...)"
                required
              />
              <button type="submit" disabled={status === "submitting"}>
                {status === "submitting"
                  ? "Redirecting to payment…"
                  : `Reserve & pay ${formatPrice(campaign.price_cents)}`}
              </button>
              {status === "error" && <p className="opt-in-form__error">{error}</p>}
            </form>
          </SignedIn>
        </div>
      )}
    </main>
  );
}
