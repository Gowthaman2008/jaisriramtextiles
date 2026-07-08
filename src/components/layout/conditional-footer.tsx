"use client";

import { usePathname } from "next/navigation";
import { Footer } from "./footer";

// Footer only appears on browsing/marketing pages — home, shop listings, and
// product pages. It's hidden on cart, checkout, account, sign-in, and admin
// so those focused flows aren't cluttered with newsletter/social links.
const FOOTER_PATTERNS = [/^\/$/, /^\/shop(\/.*)?$/, /^\/product(\/.*)?$/];

export function ConditionalFooter() {
  const pathname = usePathname();
  const showFooter = FOOTER_PATTERNS.some((pattern) => pattern.test(pathname));

  if (!showFooter) return null;
  return <Footer />;
}
