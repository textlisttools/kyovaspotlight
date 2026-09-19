"use client";

import { EnableNotificationsButton } from "@/components/EnableNotificationsButton";
import type { AdSlotWithCampaign, Lead, Scan } from "@/types/database";

type DashboardClientProps = {
  adSlots: AdSlotWithCampaign[];
  scans: Scan[];
  leads: Lead[];
};

export function DashboardClient({ adSlots, scans, leads }: DashboardClientProps) {
  const groups = new Map<string, AdSlotWithCampaign[]>();
  for (const slot of adSlots) {
    const key = slot.campaign?.name ?? "Other";
    const existing = groups.get(key);
    if (existing) {
      existing.push(slot);
    } else {
      groups.set(key, [slot]);
    }
  }

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <h1>Your ad slots</h1>
        <EnableNotificationsButton />
      </header>

      {adSlots.length === 0 && <p>No ad slots yet — reach out to get one set up.</p>}

      {Array.from(groups.entries()).map(([groupName, groupSlots]) => (
        <section key={groupName} className="ad-slot-group">
          <h2 className="ad-slot-group__title">{groupName}</h2>

          {groupSlots.map((slot) => {
            const slotScans = scans.filter((scan) => scan.ad_slot_id === slot.id);
            const slotLeads = leads.filter((lead) => lead.ad_slot_id === slot.id);

            return (
              <div key={slot.id} className="ad-slot-card">
                <h3>{slot.business_name}</h3>
                <p className="ad-slot-card__meta">
                  Code: <code>{slot.code}</code> · {slot.status}
                  {slot.payment_status === "reserved" && " · payment pending"}
                </p>
                <div className="ad-slot-card__stats">
                  <div>
                    <strong>{slotScans.length}</strong>
                    <span>scans</span>
                  </div>
                  <div>
                    <strong>{slotLeads.length}</strong>
                    <span>leads</span>
                  </div>
                </div>

                {slotLeads.length > 0 && (
                  <table className="lead-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {slotLeads.map((lead) => (
                        <tr key={lead.id}>
                          <td>{lead.name ?? "—"}</td>
                          <td>{lead.email ?? "—"}</td>
                          <td>{lead.phone ?? "—"}</td>
                          <td>{new Date(lead.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </main>
  );
}
