import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <h1 className="font-display text-4xl text-ink">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>
        <div className="zari-rule mt-6 mb-8" />
        <div className="prose prose-sm max-w-none space-y-6 text-taupe [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mt-8">
          <p>
            JAI SRI RAM TEXTILES (&ldquo;we&rdquo;, &ldquo;our&rdquo;) operates{" "}
            jaisriramtextiles.vercel.app. This policy explains what data we collect, why,
            and how we protect it.
          </p>

          <h2>Information we collect</h2>
          <p>
            When you create an account or place an order we collect your name, email address,
            delivery address, and payment reference (we never store card numbers — payments
            are handled by Razorpay). We also log anonymous page-view events to understand
            how the site is used.
          </p>

          <h2>How we use your data</h2>
          <p>
            We use your information to fulfil orders, send order and shipping updates, credit
            cashback to your wallet, and improve the site. We do not sell or share your
            personal data with third parties except as necessary to deliver your order
            (courier partners) or process payment (Razorpay).
          </p>

          <h2>Cookies</h2>
          <p>
            We use a single session cookie to keep you signed in. We do not use advertising
            or tracking cookies.
          </p>

          <h2>Data retention</h2>
          <p>
            We retain order records for seven years to comply with Indian accounting
            requirements. You may request deletion of your account and personal data at any
            time by emailing us.
          </p>

          <h2>Your rights</h2>
          <p>
            You may request access to, correction of, or deletion of your personal data at
            any time by contacting{" "}
            <a href={`mailto:${BUSINESS.email}`} className="text-zari-deep underline underline-offset-2">
              {BUSINESS.email}
            </a>
            .
          </p>
        </div>
      </Container>
    </div>
  );
}
