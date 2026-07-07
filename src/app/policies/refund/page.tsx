import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { BUSINESS } from "@/lib/constants";

export const metadata: Metadata = { title: "Refund Policy" };

export default function RefundPage() {
  return (
    <div className="py-14 sm:py-20">
      <Container className="max-w-[720px]">
        <h1 className="font-display text-4xl text-ink">Refund Policy</h1>
        <p className="mt-2 text-sm text-muted">Last updated: July 2026</p>
        <div className="zari-rule mt-6 mb-8" />
        <div className="space-y-6 text-sm leading-relaxed text-taupe [&_h2]:font-display [&_h2]:text-xl [&_h2]:text-ink [&_h2]:mt-8">

          <h2>Returns</h2>
          <p>
            We accept returns within <strong className="text-ink">7 days of delivery</strong> if
            the item is defective, damaged in transit, or significantly different from its
            description. Items must be unused and in their original packaging.
          </p>

          <h2>How to raise a return</h2>
          <p>
            Email us at{" "}
            <a href={`mailto:${BUSINESS.email}`} className="text-zari-deep underline underline-offset-2">
              {BUSINESS.email}
            </a>{" "}
            with your order number and photos of the issue within 7 days of receiving your
            order. We will respond with return instructions within 2 business days.
          </p>

          <h2>Refunds</h2>
          <p>
            Approved refunds are processed to your original payment method within 5–7
            business days of us receiving the returned item. Shipping charges are
            non-refundable unless the return is due to our error.
          </p>

          <h2>Non-returnable items</h2>
          <p>
            Items that have been used, washed, or altered cannot be returned. Sale items
            marked &ldquo;final sale&rdquo; are also non-returnable.
          </p>

          <h2>Cancellations</h2>
          <p>
            Orders cannot be cancelled once placed. Please review your cart carefully before
            completing payment.
          </p>
        </div>
      </Container>
    </div>
  );
}
