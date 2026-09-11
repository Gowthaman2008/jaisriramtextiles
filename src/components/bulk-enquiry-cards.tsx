"use client";

import { Phone, MessageCircle, Mail } from "lucide-react";

const contacts = [
  {
    icon: Phone,
    label: "Call Us",
    value: "+91 86083 86872",
    sub: "Mon–Sat, 9:00 AM – 7:00 PM",
    href: "tel:+918608386872",
    cta: "Call Now",
    trackType: "call",
  },
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "+91 86083 86872",
    sub: "Fastest way to share your requirement",
    href: "https://wa.me/918608386872?text=" + encodeURIComponent("Hi, I'm interested in placing a bulk/wholesale order with Jai Sri Ram Textiles. Please share pricing details."),
    cta: "Chat on WhatsApp",
    trackType: "whatsapp",
  },
  {
    icon: Mail,
    label: "Email",
    value: "jaisriramtextilekpm@gmail.com",
    sub: "Share your quantity & we'll quote within a day",
    href: "mailto:jaisriramtextilekpm@gmail.com?subject=" + encodeURIComponent("Bulk Order Enquiry") + "&body=" + encodeURIComponent("Hi, I'm interested in placing a bulk/wholesale order. Here are my requirements:\n\nProduct(s):\nApprox. quantity:\nOrganisation:\n"),
    cta: "Send Email",
    trackType: "email",
  },
];

function trackClick(buttonType: string) {
  // Fire-and-forget — don't block the user's navigation
  fetch("/api/bulk-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ button_type: buttonType }),
  }).catch(() => {
    // Silently ignore tracking errors
  });
}

export function BulkEnquiryCards() {
  return (
    <div className="mt-10 grid gap-5 sm:grid-cols-3">
      {contacts.map((c) => (
        <div
          key={c.label}
          className="flex flex-col items-start gap-3 rounded-card border border-line bg-white p-6 shadow-soft"
        >
          <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-zari-tint text-zari-deep">
            <c.icon size={20} />
          </span>
          <div className="w-full min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-taupe">{c.label}</p>
            <p className="mt-1 break-all font-sans text-base font-bold text-ink">{c.value}</p>
            <p className="mt-1 text-xs text-taupe">{c.sub}</p>
          </div>
          <a
            href={c.href}
            target={c.href.startsWith("http") ? "_blank" : undefined}
            rel="noopener noreferrer"
            onClick={() => trackClick(c.trackType)}
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-pill bg-zari px-4 text-sm font-semibold text-ivory transition-colors hover:bg-zari-deep"
          >
            {c.cta}
          </a>
        </div>
      ))}
    </div>
  );
}
