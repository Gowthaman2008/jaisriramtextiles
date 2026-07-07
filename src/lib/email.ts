import { formatINR } from "@/lib/utils";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "JAI SRI RAM TEXTILES <onboarding@resend.dev>";

/** Sends a transactional email via Resend's REST API. Silently no-ops (logs) if unconfigured. */
export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured — skipping email send to", to);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!res.ok) {
    console.error("Resend email send failed:", await res.text().catch(() => res.statusText));
  }
}

export function welcomeEmailHtml({ name, email, provider }: { name?: string; email: string; provider: string }) {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #2A2622; background-color: #FBF9F4;">
      <h1 style="color: #B08D4C; font-size: 22px; margin: 0 0 4px 0;">JAI SRI RAM TEXTILES</h1>
      <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 24px 0;">Premium Handloom Weavers</p>

      <p style="font-size: 15px;">Hi ${name || "there"},</p>
      <p style="font-size: 15px; line-height: 1.6;">
        Welcome to JAI SRI RAM TEXTILES! Your account has been created successfully.
      </p>

      <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
        <tr><td style="padding: 6px 0; color: #6E655A;">Email</td><td style="padding: 6px 0; font-weight: bold;">${email}</td></tr>
        <tr><td style="padding: 6px 0; color: #6E655A;">Sign-up method</td><td style="padding: 6px 0; font-weight: bold; text-transform: capitalize;">${provider}</td></tr>
        <tr><td style="padding: 6px 0; color: #6E655A;">Date</td><td style="padding: 6px 0; font-weight: bold;">${new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}</td></tr>
      </table>

      <p style="font-size: 14px; line-height: 1.6;">
        Shop premium handloom dhotis, towels, scarfs and jute bags — crafted on traditional looms in Komarapalayam, Tamil Nadu.
      </p>

      <p style="font-size: 12px; color: #9A9084; margin-top: 32px; border-top: 1px solid #E5DFD2; padding-top: 16px;">
        If you didn't create this account, please contact us at jaisriramtextiles@gmail.com.
      </p>
    </div>
  `;
}

interface OrderItemLine {
  name: string;
  variant?: string | null;
  unit_price_paise: number;
  quantity: number;
}

interface ShippingAddress {
  recipient: string;
  line1: string;
  line2?: string;
  city: string;
  district?: string;
  state: string;
  pincode: string;
  phone?: string;
}

function itemRowsHtml(items: OrderItemLine[]) {
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #EFE9DC;">${item.name}${item.variant ? ` <span style="color:#9A9084;">(${item.variant})</span>` : ""}</td>
      <td style="padding: 8px; border-bottom: 1px solid #EFE9DC; text-align:center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #EFE9DC; text-align:right;">${formatINR(item.unit_price_paise * item.quantity, true)}</td>
    </tr>
  `
    )
    .join("");
}

/** Order confirmation email — doubles as the invoice (embedded HTML, not a PDF attachment). */
export function orderConfirmationEmailHtml({
  orderNumber,
  name,
  items,
  shippingAddress,
  subtotalPaise,
  discountPaise,
  shippingPaise,
  walletUsedPaise,
  totalPaise,
  cashbackEarnedPaise,
}: {
  orderNumber: string;
  name?: string;
  items: OrderItemLine[];
  shippingAddress: ShippingAddress;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  walletUsedPaise: number;
  totalPaise: number;
  cashbackEarnedPaise: number;
}) {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #2A2622; background-color: #FBF9F4;">
      <h1 style="color: #B08D4C; font-size: 22px; margin: 0 0 4px 0;">JAI SRI RAM TEXTILES</h1>
      <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 24px 0;">Order Confirmation &amp; Invoice</p>

      <p style="font-size: 15px;">Hi ${name || "there"},</p>
      <p style="font-size: 15px; line-height: 1.6;">Thank you for your order! Here&apos;s your invoice for <strong>${orderNumber}</strong>.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background-color:#2A2622; color:#FBF9F4;">
            <th style="padding:8px; text-align:left; font-size:11px; text-transform:uppercase;">Item</th>
            <th style="padding:8px; text-align:center; font-size:11px; text-transform:uppercase;">Qty</th>
            <th style="padding:8px; text-align:right; font-size:11px; text-transform:uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml(items)}</tbody>
      </table>

      <table style="width: 260px; margin-left:auto; font-size:13px; margin-bottom:20px;">
        <tr><td style="padding:3px 0;">Subtotal</td><td style="padding:3px 0; text-align:right;">${formatINR(subtotalPaise, true)}</td></tr>
        ${discountPaise > 0 ? `<tr><td style="padding:3px 0; color:#A24B3E;">Discount</td><td style="padding:3px 0; text-align:right; color:#A24B3E;">-${formatINR(discountPaise, true)}</td></tr>` : ""}
        ${walletUsedPaise > 0 ? `<tr><td style="padding:3px 0; color:#A24B3E;">Wallet Used</td><td style="padding:3px 0; text-align:right; color:#A24B3E;">-${formatINR(walletUsedPaise, true)}</td></tr>` : ""}
        <tr><td style="padding:3px 0;">Shipping</td><td style="padding:3px 0; text-align:right;">${shippingPaise === 0 ? "FREE" : formatINR(shippingPaise, true)}</td></tr>
        <tr><td style="padding:8px 0 3px; font-weight:bold; color:#B08D4C; border-top:1px solid #B08D4C; font-size:16px;">Total Paid</td><td style="padding:8px 0 3px; text-align:right; font-weight:bold; color:#B08D4C; border-top:1px solid #B08D4C; font-size:16px;">${formatINR(totalPaise, true)}</td></tr>
        ${cashbackEarnedPaise > 0 ? `<tr><td style="padding:3px 0; color:#4B7A52;">Cashback Earned</td><td style="padding:3px 0; text-align:right; color:#4B7A52;">${formatINR(cashbackEarnedPaise, true)}</td></tr>` : ""}
      </table>

      <div style="padding:12px 16px; background-color:#FFFFFF; border:1px solid #E5DFD2; border-radius:8px; font-size:13px; margin-bottom:20px;">
        <p style="margin:0 0 6px 0; font-weight:bold; text-transform:uppercase; font-size:10px; letter-spacing:1px; color:#6E655A;">Shipping To</p>
        <p style="margin:0;">${shippingAddress.recipient}<br/>
        ${shippingAddress.line1}${shippingAddress.line2 ? ", " + shippingAddress.line2 : ""}<br/>
        ${shippingAddress.city}${shippingAddress.district ? ", " + shippingAddress.district : ""}, ${shippingAddress.state} - ${shippingAddress.pincode}
        ${shippingAddress.phone ? `<br/>Phone: ${shippingAddress.phone}` : ""}</p>
      </div>

      <p style="font-size: 13px; line-height: 1.6;">We&apos;ll email you again once your order is delivered. You can also track it anytime from your account.</p>

      <p style="font-size: 12px; color: #9A9084; margin-top: 32px; border-top: 1px solid #E5DFD2; padding-top: 16px;">
        Questions about your order? Contact us at jaisriramtextiles@gmail.com.
      </p>
    </div>
  `;
}

export function orderDeliveredEmailHtml({
  orderNumber,
  name,
  items,
  totalPaise,
}: {
  orderNumber: string;
  name?: string;
  items: OrderItemLine[];
  totalPaise: number;
}) {
  return `
    <div style="font-family: Georgia, 'Times New Roman', serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #2A2622; background-color: #FBF9F4;">
      <h1 style="color: #B08D4C; font-size: 22px; margin: 0 0 4px 0;">JAI SRI RAM TEXTILES</h1>
      <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0 0 24px 0;">Order Delivered</p>

      <p style="font-size: 15px;">Hi ${name || "there"},</p>
      <p style="font-size: 15px; line-height: 1.6;">Great news — your order <strong>${orderNumber}</strong> has been delivered!</p>

      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background-color:#2A2622; color:#FBF9F4;">
            <th style="padding:8px; text-align:left; font-size:11px; text-transform:uppercase;">Item</th>
            <th style="padding:8px; text-align:center; font-size:11px; text-transform:uppercase;">Qty</th>
            <th style="padding:8px; text-align:right; font-size:11px; text-transform:uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRowsHtml(items)}</tbody>
      </table>

      <p style="font-size:14px;">Order Total: <strong>${formatINR(totalPaise, true)}</strong></p>

      <p style="font-size: 14px; line-height: 1.6;">
        Any cashback earned on this order has now been credited to your wallet. We hope you love your new handloom pieces — thank you for shopping with us!
      </p>

      <p style="font-size: 13px; line-height: 1.6;">
        If anything about your order isn&apos;t right, reply to this email or reach us at jaisriramtextiles@gmail.com and we&apos;ll sort it out.
      </p>

      <p style="font-size: 12px; color: #9A9084; margin-top: 32px; border-top: 1px solid #E5DFD2; padding-top: 16px;">
        JAI SRI RAM TEXTILES — Premium Handloom Weavers, Komarapalayam, Tamil Nadu.
      </p>
    </div>
  `;
}
