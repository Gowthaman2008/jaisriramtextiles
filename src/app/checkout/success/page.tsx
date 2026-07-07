"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShoppingBag, ArrowRight, ShieldCheck } from "lucide-react";

function OrderSuccessPageContent() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order_number") || "JSRT-2026-UNKNOWN";

  // Calculate estimated delivery date: 4 days from now
  const estDeliveryDate = new Date();
  estDeliveryDate.setDate(estDeliveryDate.getDate() + 4);
  const deliveryDateString = estDeliveryDate.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="py-16 sm:py-24 bg-ivory min-h-[75vh] flex items-center">
      <Container className="max-w-[580px] text-center">
        {/* Success Icon with Zari theme */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success border-2 border-success/20 mb-8 animate-fade-up">
          <CheckCircle2 size={42} />
        </div>

        <div className="space-y-4 animate-fade-up">
          <h1 className="font-display text-3xl sm:text-4xl text-ink">Thank you for your order!</h1>
          <p className="text-sm text-taupe max-w-[460px] mx-auto">
            Your payment was processed successfully. We are now preparing your premium handloom package for dispatch.
          </p>
        </div>

        {/* Order Receipt Details Card */}
        <div className="zari-frame bg-white border border-line p-6 rounded-card my-8 text-left shadow-soft space-y-4 animate-fade-up">
          <div className="flex justify-between items-center border-b border-line pb-3">
            <span className="text-xs font-semibold text-taupe uppercase tracking-wider">Order Number</span>
            <span className="font-mono font-bold text-ink text-sm sm:text-base">{orderNumber}</span>
          </div>
          <div className="flex justify-between items-start border-b border-line pb-3">
            <span className="text-xs font-semibold text-taupe uppercase tracking-wider mt-0.5">Estimated Delivery</span>
            <div className="text-right">
              <p className="font-bold text-zari-deep text-sm">{deliveryDateString}</p>
              <p className="text-[10px] text-muted">Standard Express Surface Shipping (3-5 days)</p>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-taupe uppercase tracking-wider">Shipping Carrier</span>
            <span className="font-semibold text-ink text-xs">Standard Surface Surface Courier</span>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 animate-fade-up">
          <Button href="/shop" variant="gold" size="lg" className="w-full sm:w-auto">
            <ShoppingBag size={18} />
            Continue Shopping
          </Button>
          <Button href="/account" variant="outline" size="lg" className="w-full sm:w-auto bg-white hover:bg-cream border-line">
            Go to My Account
            <ArrowRight size={18} />
          </Button>
        </div>

        <div className="mt-12 flex items-center justify-center gap-2 text-[10px] text-muted">
          <ShieldCheck size={14} className="text-success" />
          Prepaid transaction completed securely.
        </div>
      </Container>
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-ivory">
        <div className="animate-spin text-zari w-10 h-10 mb-3" />
        <p className="font-display text-lg text-ink">Loading success page...</p>
      </div>
    }>
      <OrderSuccessPageContent />
    </Suspense>
  );
}
