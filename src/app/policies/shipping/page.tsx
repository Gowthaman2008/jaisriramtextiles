import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { COMMERCE } from "@/lib/constants";
import { formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Shipping Policy" };

export default function ShippingPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <h1 className="font-display text-4xl text-ink">Shipping Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>
        <div className="zari-rule mt-6 mb-8" />
        <div className="space-y-6 text-sm leading-relaxed text-taupe [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mt-8">

          <h2>Shipping charges</h2>
          <p>
            A flat shipping fee of{" "}
            <strong className="text-ink">{formatINR(COMMERCE.shippingChargePaise, true)}</strong>{" "}
            applies to all orders. Orders with a subtotal above{" "}
            <strong className="text-ink">{formatINR(COMMERCE.freeShippingThresholdPaise, true)}</strong>{" "}
            qualify for free shipping, automatically applied at checkout.
          </p>

          <h2>Delivery time</h2>
          <p>
            Most orders are dispatched within 24–48 hours of payment confirmation. Estimated
            delivery is{" "}
            <strong className="text-ink">{COMMERCE.deliveryEstimate}</strong> across India,
            depending on your pin code and the courier&apos;s schedule.
          </p>

          <h2>Tracking</h2>
          <p>
            Once your order is shipped, a tracking ID is added to your order in your account
            dashboard. Use it to follow your parcel on the courier&apos;s website.
          </p>

          <h2>Delivery areas</h2>
          <p>
            We ship to all serviceable pin codes across India. At this time we do not offer
            international shipping.
          </p>

          <h2>Failed delivery</h2>
          <p>
            If a delivery attempt fails and the parcel is returned to us, we will contact you
            by email to arrange a re-dispatch. Re-dispatch may attract a second shipping fee.
          </p>
        </div>
      </Container>
    </div>
  );
}
