import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";

export default function ReserveSuccessPage() {
  return (
    <>
      <SiteHeader />
      <main className="status-page">
        <h1>You&apos;re all set!</h1>
        <p>
          Your slot is reserved and payment is complete. It may take a minute to show as
          confirmed on your dashboard.
        </p>
        <p>
          <Link href="/dashboard">Go to your dashboard</Link>
        </p>
      </main>
    </>
  );
}
