import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { SiteHeader } from "@/components/SiteHeader";

const steps = [
  {
    number: "01",
    title: "Reserve your spot",
    body: "Pick a slot on our next postcard route across Kentucky, Ohio, or West Virginia. Every household on that route gets it — guaranteed, no algorithm deciding who sees it.",
  },
  {
    number: "02",
    title: "We design & mail it",
    body: "Your ad goes out with a unique QR code. No design work or website changes required on your end.",
  },
  {
    number: "03",
    title: "Watch leads roll in",
    body: "Every scan and every opt-in shows up on your dashboard in real time, with a push notification the second it happens.",
  },
];

const valueProps = [
  {
    title: "Physical & unskippable",
    body: "A postcard on the counter can't be scrolled past, muted, or blocked the way a digital ad can.",
  },
  {
    title: "Provably working",
    body: "Every scan is logged automatically — no more guessing whether the ad \"did anything.\"",
  },
  {
    title: "Instant leads",
    body: "Visitors can share their name and email before continuing to your site — a warm lead, not just a click.",
  },
  {
    title: "Zero setup on your end",
    body: "No code, no plugin, no app to install. You just show up to your own website like normal.",
  },
];

const faqs = [
  {
    question: "Do I need to change anything on my website?",
    answer:
      "No. We host the lead-capture page that appears right after someone scans — you just receive the leads and keep the traffic. Your site stays exactly as it is.",
  },
  {
    question: "How do I see my results?",
    answer:
      "Sign in to your advertiser dashboard any time — scan counts and your lead list update in real time, no waiting for a report.",
  },
  {
    question: "Can I get notified the moment someone scans?",
    answer:
      "Yes. Enable push notifications from your dashboard and get an alert on your phone or computer the instant it happens.",
  },
  {
    question: "What's the coverage area?",
    answer:
      "We mail postcard routes across Kentucky, Ohio, and West Virginia — the KYOVA tri-state area.",
  },
  {
    question: "How much does a spot cost?",
    answer:
      "See live pricing and availability on the current postcard at /reserve — reserve and pay online, or reach out below if you'd rather talk it through first.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />

      <section className="hero">
        <div className="hero__inner">
          <div className="hero__text">
            <span className="hero__badge">Now signing up advertisers across KYOVA</span>
            <h1>Put your business in every mailbox on the route.</h1>
            <p>
              A postcard that lands in real mailboxes, with a QR code that tells you exactly
              who scanned it — name, email, and the moment it happened, sent straight to your
              phone.
            </p>
            <div className="hero__actions">
              <a href="#how-it-works" className="hero__cta">
                See how it works
              </a>
              <SignedOut>
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button>Already advertising? Sign in</button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/dashboard">Go to your dashboard</Link>
              </SignedIn>
            </div>
          </div>
          <Image
            src="/hero-postcard.png"
            alt="A KYOVA Spotlight postcard, with QR codes for local businesses, being pulled from a mailbox"
            width={764}
            height={508}
            priority
            className="hero__image"
          />
        </div>
      </section>

      <section id="how-it-works" className="section">
        <h2 className="section__title">How it works</h2>
        <Image
          src="/how-it-works.png"
          alt="Your ad is created, your postcard is mailed, it's on the way to local homes, and your ad reaches local customers"
          width={2172}
          height={724}
          className="how-it-works__image"
        />
        <div className="step-grid">
          {steps.map((step) => (
            <div className="step-card" key={step.number}>
              <span className="step-card__number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--panel">
        <h2 className="section__title">Why postcard + QR beats another social ad</h2>
        <div className="value-grid">
          {valueProps.map((item) => (
            <div className="value-card" key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-banner">
        <div className="cta-banner__inner">
          <h2>Spots fill up fast on every route.</h2>
          <p>Reserve a spot online, or reach out with questions first — no obligation.</p>
          <Link href="/reserve">
            <button>See available slots &amp; reserve one</button>
          </Link>
          <div className="cta-banner__contact">
            <a href="mailto:postcard@kyovaspotlight.com">postcard@kyovaspotlight.com</a>
            <a href="tel:+13049623018">304-962-3018</a>
          </div>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Questions advertisers ask</h2>
        <div className="faq-list">
          {faqs.map((item) => (
            <div className="faq-item" key={item.question}>
              <h3>{item.question}</h3>
              <p>{item.answer}</p>
            </div>
          ))}
        </div>
        <iframe
          className="coverage-map"
          title="KYOVA Spotlight coverage area — Huntington, WV"
          src="https://www.google.com/maps?q=Huntington,+WV&output=embed"
          loading="lazy"
        />
      </section>

      <footer className="site-footer">
        <div className="site-footer__inner">
          <div className="site-footer__brand">
            <Image src="/icon-512.png" alt="" width={40} height={40} />
            <div>
              <strong>KYOVA Spotlight</strong>
              <p>Serving Kentucky, Ohio &amp; West Virginia</p>
              <p>
                <a href="mailto:postcard@kyovaspotlight.com">postcard@kyovaspotlight.com</a>
                {" · "}
                <a href="tel:+13049623018">304-962-3018</a>
              </p>
            </div>
          </div>
          <div className="site-footer__links">
            <Link href="/reserve">Reserve a spot</Link>
            <Link href="/privacy">Privacy policy</Link>
            <Link href="/admin">Admin</Link>
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                <button>Advertiser sign in</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/dashboard">Advertiser dashboard</Link>
            </SignedIn>
          </div>
        </div>
      </footer>
    </>
  );
}
