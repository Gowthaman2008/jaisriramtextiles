"use client";

import { useEffect, useState } from "react";
import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { Truck, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";

export function ShippingInfo() {
  const [shippingThreshold, setShippingThreshold] = useState(699);
  const [shippingCharge, setShippingCharge] = useState(99);

  useEffect(() => {
    fetch("/api/shipping-settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (typeof data.free_shipping_threshold_paise === "number") {
            setShippingThreshold(data.free_shipping_threshold_paise / 100);
          }
          if (typeof data.shipping_charge_paise === "number") {
            setShippingCharge(data.shipping_charge_paise / 100);
          }
        }
      })
      .catch((err) => console.error("Failed to load shipping settings:", err));
  }, []);

  const items = [
    { icon: Truck, title: `Free shipping over ₹${shippingThreshold}`, text: `A flat ₹${shippingCharge} applies below that. Delivered in 4–7 business days.` },
    { icon: PackageCheck, title: "Carefully packed", text: "Every order is inspected and packed to arrive in perfect condition." },
    { icon: RefreshCw, title: "7 Days Easy Return", text: "Return or replacement is only accepted if the product was received in a damaged condition." },
    { icon: ShieldCheck, title: "Secure checkout", text: "Payments handled securely via Razorpay. Your data stays protected." },
  ];

  return (
    <section className="border-y border-line bg-cream py-14">
      <Container>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <Reveal key={it.title} delay={i * 0.06} className="flex items-start gap-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-zari/40 text-zari-deep">
                <it.icon size={19} />
              </span>
              <div>
                <h3 className="font-display text-base text-ink">{it.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-taupe">{it.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
