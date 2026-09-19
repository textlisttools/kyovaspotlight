"use client";

import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="site-header__brand">
          <Image src="/icon-512.png" alt="KYOVA Spotlight" width={44} height={44} priority />
        </Link>
        <nav className="site-header__nav">
          <Link href="/reserve">Reserve a spot</Link>
          <SignedIn>
            <Link href="/dashboard">Dashboard</Link>
          </SignedIn>
          <Link href="/privacy">Privacy</Link>
          <SignedOut>
            <SignInButton mode="modal" forceRedirectUrl="/dashboard">
              <button>Advertiser sign in</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </nav>
      </div>
    </header>
  );
}
