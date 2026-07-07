import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { BUSINESS, COMMERCE } from "@/lib/constants";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <h1 className="font-display text-4xl text-ink">Terms &amp; Conditions</h1>
        <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>
        <div className="zari-rule mt-6 mb-8" />
        <div className="space-y-6 text-sm leading-relaxed text-taupe [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mt-8">
          <p>
            By using this website you agree to the following terms. Please read them carefully.
          </p>

          <h2>Orders &amp; pricing</h2>
          <p>
            All prices are in Indian Rupees and inclusive of applicable taxes. We reserve the
            right to correct pricing errors before accepting an order. An order is confirmed
            only after successful payment.
          </p>

          <h2>Cancellations</h2>
          <p>
            Orders cannot be cancelled once placed. This is a firm business rule to protect
            our weavers&apos; livelihoods and prevent abuse of the cashback system.
          </p>

          <h2>Shipping</h2>
          <p>
            Shipping costs {formatINR(COMMERCE.shippingChargePaise, true)} per order.
            Orders above {formatINR(COMMERCE.freeShippingThresholdPaise, true)} ship free.
            Estimated delivery is {COMMERCE.deliveryEstimate}.
          </p>

          <h2>Wallet &amp; cashback</h2>
          <p>
            Cashback is credited to your wallet only after the order status reaches
            &ldquo;Delivered&rdquo;. Wallet balance may be used to pay up to{" "}
            {COMMERCE.walletMaxUsagePercent}% of any order value. Cashback expires after
            180 days if unused.
          </p>

          <h2>Intellectual property</h2>
          <p>
            All content on this site — text, images, and design — is owned by JAI SRI RAM
            TEXTILES. You may not reproduce it without written permission.
          </p>

          <h2>Contact</h2>
          <p>
            Questions?{" "}
            <a href={`mailto:${BUSINESS.email}`} className="text-zari-deep underline underline-offset-2">
              {BUSINESS.email}
            </a>
          </p>
        </div>
      </Container>
    </div>
  );
}
