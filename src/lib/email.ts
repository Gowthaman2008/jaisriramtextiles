import { formatINR } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { drawInvoicePdf } from "@/lib/invoice-generator";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Jai Sri Ram Textiles <onboarding@resend.dev>";

function wrapEmailHtml(bodyContent: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    :root {
      color-scheme: light;
      supported-color-schemes: light;
    }
    
    @media (prefers-color-scheme: dark) {
      body, .email-bg {
        background-color: #F5F2EB !important;
        background-image: linear-gradient(#F5F2EB, #F5F2EB) !important;
        color: #2A2622 !important;
      }
      .email-card {
        background-color: #FBF9F4 !important;
        background-image: linear-gradient(#FBF9F4, #FBF9F4) !important;
        color: #2A2622 !important;
        border-color: #E5DFD2 !important;
      }
      .email-title, h1, h2, h3, h4, p, span, td, table, strong, div, b {
        color: #2A2622 !important;
      }
      th {
        background-color: #2A2622 !important;
        background-image: linear-gradient(#2A2622, #2A2622) !important;
        color: #FBF9F4 !important;
      }
      a {
        color: #B08D4C !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); font-family: Georgia, 'Times New Roman', serif; -webkit-font-smoothing: antialiased; color: #2A2622;">
  ${bodyContent}
</body>
</html>`;
}

/** Sends a transactional email via Resend's REST API. Silently no-ops (logs) if unconfigured. */
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content: string }>;
}) {
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured — skipping email send to", to);
    return;
  }

  const emailBody: any = { from: FROM_ADDRESS, to, subject, html: wrapEmailHtml(html) };
  if (attachments) {
    emailBody.attachments = attachments;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emailBody),
  });

  if (!res.ok) {
    console.error("Resend email send failed:", await res.text().catch(() => res.statusText));
  }
}

export function welcomeEmailHtml({ name, email, provider }: { name?: string; email: string; provider: string }) {
  return `
    <div class="email-bg" style="background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #FBF9F4; background-image: linear-gradient(#FBF9F4, #FBF9F4); border: 1px solid #E5DFD2; border-radius: 12px; border-top: 5px solid #B08D4C; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #E5DFD2; text-align: center;">
          <h1 style="color: #B08D4C; font-size: 24px; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 1px;">JAI SRI RAM TEXTILES</h1>
          <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Premium Handloom Weavers</p>
        </div>
        
        <div style="padding: 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${name || "there"},</p>
          <p style="margin: 0 0 20px 0;">
            Welcome to JAI SRI RAM TEXTILES! Your account has been created successfully.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
            <tr><td style="padding: 8px 0; color: #6E655A; border-bottom: 1px solid #E5DFD2;">Email</td><td style="padding: 8px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #E5DFD2;">${email}</td></tr>
            <tr><td style="padding: 8px 0; color: #6E655A; border-bottom: 1px solid #E5DFD2;">Sign-up method</td><td style="padding: 8px 0; font-weight: bold; text-transform: capitalize; text-align: right; border-bottom: 1px solid #E5DFD2;">${provider}</td></tr>
            <tr><td style="padding: 8px 0; color: #6E655A;">Date</td><td style="padding: 8px 0; font-weight: bold; text-align: right;">${new Date().toLocaleString("en-IN", { dateStyle: "long", timeStyle: "short" })}</td></tr>
          </table>

          <p style="margin: 20px 0 0 0;">
            Shop premium handloom dhotis, towels, scarfs and jute bags — crafted on traditional looms in Komarapalayam, Tamil Nadu.
          </p>
        </div>

        <div style="padding: 24px 32px; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); border-top: 1px solid #E5DFD2; font-size: 11px; color: #9A9084; text-align: center; line-height: 1.5;">
          If you didn't create this account, please contact us at jaisriramtextiles@gmail.com.<br/>
          JAI SRI RAM TEXTILES — <a href="https://jaisriramtextiles.in" style="color: #B08D4C; text-decoration: none; font-weight: bold;">jaisriramtextiles.in</a>
        </div>
      </div>
    </div>
  `;
}

export function passwordResetEmailHtml({ name, resetLink }: { name?: string; resetLink: string }) {
  return `
    <div class="email-bg" style="background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 480px; margin: 0 auto; background-color: #FBF9F4; background-image: linear-gradient(#FBF9F4, #FBF9F4); border: 1px solid #E5DFD2; border-radius: 12px; border-top: 5px solid #B08D4C; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #E5DFD2; text-align: center;">
          <h1 style="color: #B08D4C; font-size: 24px; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 1px;">JAI SRI RAM TEXTILES</h1>
          <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Premium Handloom Weavers</p>
        </div>
        
        <div style="padding: 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${name || "there"},</p>
          <p style="margin: 0 0 24px 0;">
            We received a request to reset your password. Follow the link below to choose a new one:
          </p>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background-color: #B08D4C; color: #FFFFFF; text-decoration: none; border-radius: 24px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; box-shadow: 0 2px 8px rgba(176, 141, 76, 0.3); transition: all 0.2s ease;">
              Reset password
            </a>
          </div>

          <p style="color: #6E655A; font-size: 12px; margin: 24px 0 0 0; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email. This link will expire shortly.
          </p>
        </div>

        <div style="padding: 24px 32px; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); border-top: 1px solid #E5DFD2; font-size: 11px; color: #9A9084; text-align: center; line-height: 1.5;">
          JAI SRI RAM TEXTILES — Premium Handloom Weavers, <a href="https://jaisriramtextiles.in" style="color: #B08D4C; text-decoration: none; font-weight: bold;">jaisriramtextiles.in</a>
        </div>
      </div>
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
  userId,
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
  userId?: string | number;
}) {
  return `
    <div class="email-bg" style="background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; background-image: linear-gradient(#FBF9F4, #FBF9F4); border: 1px solid #E5DFD2; border-radius: 12px; border-top: 5px solid #B08D4C; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #E5DFD2; text-align: center;">
          <h1 style="color: #B08D4C; font-size: 24px; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 1px;">JAI SRI RAM TEXTILES</h1>
          <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Order Confirmation &amp; Invoice</p>
        </div>
        
        <div style="padding: 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${name || "there"},</p>
          <p style="margin: 0 0 20px 0;">Thank you for your order! Here&apos;s your invoice for <strong>${orderNumber}</strong>.</p>
          ${userId ? `<p style="margin: 0 0 20px 0; font-family: monospace; font-size: 13px; color: #6E655A;"><strong>User ID:</strong> ${userId}</p>` : ""}
 
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <thead>
              <tr style="background-color:#2A2622; background-image: linear-gradient(#2A2622, #2A2622); color:#FBF9F4;">
                <th style="padding:8px; text-align:left; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Item</th>
                <th style="padding:8px; text-align:center; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Qty</th>
                <th style="padding:8px; text-align:right; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRowsHtml(items)}</tbody>
          </table>
 
          <table style="width: 260px; margin-left:auto; font-size:13px; margin-bottom:20px;">
            <tr><td style="padding:3px 0; color: #6E655A;">Subtotal</td><td style="padding:3px 0; text-align:right; font-weight: bold;">${formatINR(subtotalPaise, true)}</td></tr>
            ${discountPaise > 0 ? `<tr><td style="padding:3px 0; color:#A24B3E;">Discount</td><td style="padding:3px 0; text-align:right; color:#A24B3E; font-weight: bold;">-${formatINR(discountPaise, true)}</td></tr>` : ""}
            ${walletUsedPaise > 0 ? `<tr><td style="padding:3px 0; color:#A24B3E;">Wallet Used</td><td style="padding:3px 0; text-align:right; color:#A24B3E; font-weight: bold;">-${formatINR(walletUsedPaise, true)}</td></tr>` : ""}
            <tr><td style="padding:3px 0; color: #6E655A;">Shipping</td><td style="padding:3px 0; text-align:right; font-weight: bold;">${shippingPaise === 0 ? "FREE" : formatINR(shippingPaise, true)}</td></tr>
            <tr><td style="padding:8px 0 3px; font-weight:bold; color:#B08D4C; border-top:1px solid #B08D4C; font-size:16px;">Total Paid</td><td style="padding:8px 0 3px; text-align:right; font-weight:bold; color:#B08D4C; border-top:1px solid #B08D4C; font-size:16px;">${formatINR(totalPaise, true)}</td></tr>
            ${cashbackEarnedPaise > 0 ? `<tr><td style="padding:3px 0; color:#4B7A52;">Cashback Earned</td><td style="padding:3px 0; text-align:right; color:#4B7A52; font-weight: bold;">${formatINR(cashbackEarnedPaise, true)}</td></tr>` : ""}
          </table>
 
          <div style="padding:16px; background-color:#FFFFFF; background-image: linear-gradient(#FFFFFF, #FFFFFF); border:1px solid #E5DFD2; border-radius:8px; font-size:13px; margin-bottom:20px;">
            <p style="margin:0 0 6px 0; font-weight:bold; text-transform:uppercase; font-size:10px; letter-spacing:1px; color:#6E655A;">Shipping To</p>
            <p style="margin:0; line-height: 1.5; color: #2A2622;">${shippingAddress.recipient}<br/>
            ${shippingAddress.line1}${shippingAddress.line2 ? ", " + shippingAddress.line2 : ""}<br/>
            ${shippingAddress.city}${shippingAddress.district ? ", " + shippingAddress.district : ""}, ${shippingAddress.state} - ${shippingAddress.pincode}
            ${shippingAddress.phone ? `<br/>Phone: ${shippingAddress.phone}` : ""}</p>
          </div>
 
          <p style="font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">We&apos;ll email you again once your order is delivered. You can also track it anytime from your account.</p>
        </div>
 
        <div style="padding: 24px 32px; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); border-top: 1px solid #E5DFD2; font-size: 11px; color: #9A9084; text-align: center; line-height: 1.5;">
          Questions about your order? Contact us at jaisriramtextiles@gmail.com.<br/>
          JAI SRI RAM TEXTILES — <a href="https://jaisriramtextiles.in" style="color: #B08D4C; text-decoration: none; font-weight: bold;">jaisriramtextiles.in</a>
        </div>
      </div>
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
    <div class="email-bg" style="background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; background-image: linear-gradient(#FBF9F4, #FBF9F4); border: 1px solid #E5DFD2; border-radius: 12px; border-top: 5px solid #B08D4C; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #E5DFD2; text-align: center;">
          <h1 style="color: #B08D4C; font-size: 24px; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 1px;">JAI SRI RAM TEXTILES</h1>
          <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Order Delivered</p>
        </div>
        
        <div style="padding: 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${name || "there"},</p>
          <p style="margin: 0 0 20px 0;">Great news — your order <strong>${orderNumber}</strong> has been delivered!</p>
 
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <thead>
              <tr style="background-color:#2A2622; background-image: linear-gradient(#2A2622, #2A2622); color:#FBF9F4;">
                <th style="padding:8px; text-align:left; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Item</th>
                <th style="padding:8px; text-align:center; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Qty</th>
                <th style="padding:8px; text-align:right; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRowsHtml(items)}</tbody>
          </table>
 
          <p style="font-size:14px; margin-bottom: 16px;">Order Total: <strong>${formatINR(totalPaise, true)}</strong></p>
 
          <p style="font-size: 14px; line-height: 1.6; margin: 16px 0;">
            Any cashback earned on this order has now been credited to your wallet. We hope you love your new handloom pieces — thank you for shopping with us!
          </p>
 
          <p style="font-size: 13px; line-height: 1.6; margin: 16px 0 0 0;">
            If anything about your order isn&apos;t right, reply to this email or reach us at jaisriramtextiles@gmail.com and we&apos;ll sort it out.
          </p>
        </div>
 
        <div style="padding: 24px 32px; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); border-top: 1px solid #E5DFD2; font-size: 11px; color: #9A9084; text-align: center; line-height: 1.5;">
          Thank you for shopping with us!<br/>
          JAI SRI RAM TEXTILES — <a href="https://jaisriramtextiles.in" style="color: #B08D4C; text-decoration: none; font-weight: bold;">jaisriramtextiles.in</a>
        </div>
      </div>
    </div>
  `;
}

export function refundProcessedEmailHtml({
  orderNumber,
  name,
  items,
  totalPaidPaise,
  refundAmountPaise,
  transactionId,
  note,
  screenshotUrl,
}: {
  orderNumber: string;
  name?: string;
  items: OrderItemLine[];
  totalPaidPaise: number;
  refundAmountPaise: number;
  transactionId?: string | null;
  note?: string | null;
  screenshotUrl?: string | null;
}) {
  return `
    <div class="email-bg" style="background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; background-image: linear-gradient(#FBF9F4, #FBF9F4); border: 1px solid #E5DFD2; border-radius: 12px; border-top: 5px solid #B08D4C; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #E5DFD2; text-align: center;">
          <h1 style="color: #B08D4C; font-size: 24px; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 1px;">JAI SRI RAM TEXTILES</h1>
          <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Refund Processed</p>
        </div>
        
        <div style="padding: 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${name || "there"},</p>
          <p style="margin: 0 0 20px 0;">
            Great news — we have processed the refund for your order <strong>${orderNumber}</strong>. Here is your refund summary:
          </p>
 
          <!-- Refund Summary Box -->
          <div style="padding: 16px 20px; background-color: #FFFFFF; background-image: linear-gradient(#FFFFFF, #FFFFFF); border: 1px solid #E5DFD2; border-radius: 8px; margin-bottom: 24px;">
            <table style="width: 100%; font-size: 13px; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6E655A; border-bottom: 1px solid #E5DFD2;">Original Order Value</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #E5DFD2;">${formatINR(totalPaidPaise, true)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #4B7A52; font-weight: bold; border-bottom: 1px solid #E5DFD2; font-size: 14px;">Refunded Amount</td>
                <td style="padding: 8px 0; font-weight: bold; color: #4B7A52; text-align: right; border-bottom: 1px solid #E5DFD2; font-size: 14px;">${formatINR(refundAmountPaise, true)}</td>
              </tr>
              ${transactionId ? `
              <tr>
                <td style="padding: 6px 0; color: #6E655A; border-bottom: 1px solid #E5DFD2;">Transaction ID</td>
                <td style="padding: 6px 0; font-family: monospace; text-align: right; border-bottom: 1px solid #E5DFD2;">${transactionId}</td>
              </tr>` : ""}
              <tr>
                <td style="padding: 6px 0; color: #6E655A; border-bottom: 1px solid #E5DFD2;">Refund Date</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; border-bottom: 1px solid #E5DFD2;">${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</td>
              </tr>
              ${note ? `
              <tr>
                <td style="padding: 6px 0; color: #6E655A;">Notes</td>
                <td style="padding: 6px 0; text-align: right; font-style: italic;">${note}</td>
              </tr>` : ""}
            </table>
            ${screenshotUrl ? `
            <div style="margin-top: 16px; text-align: center;">
              <a href="${screenshotUrl}" target="_blank" style="display: inline-block; padding: 8px 16px; border: 1px solid #B08D4C; color: #B08D4C; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px;">
                View Refund Receipt ↗
              </a>
            </div>` : ""}
          </div>
 
          <!-- Itemized Order Details -->
          <p style="font-weight: bold; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; color: #6E655A; letter-spacing: 1px;">Itemized Order Details</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
            <thead>
              <tr style="background-color: #2A2622; background-image: linear-gradient(#2A2622, #2A2622); color: #FBF9F4;">
                <th style="padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; color: #FBF9F4;">Item</th>
                <th style="padding: 8px; text-align: center; font-size: 11px; text-transform: uppercase; color: #FBF9F4;">Qty</th>
                <th style="padding: 8px; text-align: right; font-size: 11px; text-transform: uppercase; color: #FBF9F4;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #E5DFD2;">${item.name}${item.variant ? ` <span style="color:#9A9084;">(${item.variant})</span>` : ""}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #E5DFD2; text-align: center;">${item.quantity}</td>
                  <td style="padding: 8px; border-bottom: 1px solid #E5DFD2; text-align: right;">${formatINR(item.unit_price_paise * item.quantity, true)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
 
          <p style="margin: 20px 0 0 0; line-height: 1.5;">
            The refund has been credited back to your original payment method. Depending on your bank, it should reflect in your account within 3-5 business days.
          </p>
        </div>
 
        <div style="padding: 24px 32px; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); border-top: 1px solid #E5DFD2; font-size: 11px; color: #9A9084; text-align: center; line-height: 1.5;">
          Questions? Reply to this email or contact us at jaisriramtextiles@gmail.com.<br/>
          JAI SRI RAM TEXTILES — <a href="https://jaisriramtextiles.in" style="color: #B08D4C; text-decoration: none; font-weight: bold;">jaisriramtextiles.in</a>
        </div>
      </div>
    </div>
  `;
}

export function orderRejectedEmailHtml({
  orderNumber,
  name,
  items,
  totalPaise,
  rejectionReason,
}: {
  orderNumber: string;
  name?: string;
  items: OrderItemLine[];
  totalPaise: number;
  rejectionReason?: string | null;
}) {
  return `
    <div class="email-bg" style="background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; background-image: linear-gradient(#FBF9F4, #FBF9F4); border: 1px solid #E5DFD2; border-radius: 12px; border-top: 5px solid #A24B3E; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        <div style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #E5DFD2; text-align: center;">
          <h1 style="color: #A24B3E; font-size: 24px; margin: 0 0 4px 0; font-weight: bold; letter-spacing: 1px;">JAI SRI RAM TEXTILES</h1>
          <p style="font-size: 11px; color: #6E655A; text-transform: uppercase; letter-spacing: 2px; margin: 0;">Order Rejected</p>
        </div>
        
        <div style="padding: 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi ${name || "there"},</p>
          <p style="margin: 0 0 20px 0;">
            We regret to inform you that your order <strong>${orderNumber}</strong> has been rejected.
          </p>
 
          ${rejectionReason ? `
          <div style="padding: 12px 16px; background-color: #FDF2F2; background-image: linear-gradient(#FDF2F2, #FDF2F2); border: 1px solid #F8D7DA; border-radius: 6px; color: #721C24; font-size: 13px; margin-bottom: 20px;">
            <strong>Reason for rejection:</strong> ${rejectionReason}
          </div>
          ` : ""}
 
          <div style="padding: 16px 20px; background-color: #FFFFFF; background-image: linear-gradient(#FFFFFF, #FFFFFF); border: 1px solid #E5DFD2; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #B08D4C;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #B08D4C; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Refund Policy</p>
            <p style="margin: 0; font-size: 12.5px; color: #6E655A; line-height: 1.5;">
              Refund will be issued within 24 hours. We will notify you via a separate email immediately once the refund has been processed.
            </p>
          </div>
 
          <!-- Itemized list -->
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <thead>
              <tr style="background-color:#2A2622; background-image: linear-gradient(#2A2622, #2A2622); color:#FBF9F4;">
                <th style="padding:8px; text-align:left; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Item</th>
                <th style="padding:8px; text-align:center; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Qty</th>
                <th style="padding:8px; text-align:right; font-size:11px; text-transform:uppercase; color:#FBF9F4;">Total</th>
              </tr>
            </thead>
            <tbody>${itemRowsHtml(items)}</tbody>
          </table>
 
          <p style="font-size:14px; margin-bottom: 16px;">Total Paid: <strong>${formatINR(totalPaise, true)}</strong></p>
 
          <p style="font-size: 13px; line-height: 1.6; margin: 20px 0 0 0; color: #6E655A;">
            If you have any questions or would like to speak to customer service, you can reply directly to this email or contact us on WhatsApp.
          </p>
        </div>
 
        <div style="padding: 24px 32px; background-color: #F5F2EB; background-image: linear-gradient(#F5F2EB, #F5F2EB); border-top: 1px solid #E5DFD2; font-size: 11px; color: #9A9084; text-align: center; line-height: 1.5;">
          JAI SRI RAM TEXTILES — <a href="https://jaisriramtextiles.in" style="color: #B08D4C; text-decoration: none; font-weight: bold;">jaisriramtextiles.in</a>
        </div>
      </div>
    </div>
  `;
}

export function generateInvoicePdfBase64({
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
  userId,
}: {
  orderNumber: string;
  name?: string;
  items: any[];
  shippingAddress: any;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  walletUsedPaise: number;
  totalPaise: number;
  cashbackEarnedPaise: number;
  userId?: string | number;
}): string {
  const doc = new jsPDF();
  
  // Reconstruct order object for shared drawInvoicePdf call
  const orderObj = {
    order_number: orderNumber,
    placed_at: new Date(),
    shipping_address: {
      recipient: name || shippingAddress.recipient || "Customer",
      ...shippingAddress,
    },
    order_items: items,
    subtotal_paise: subtotalPaise,
    discount_paise: discountPaise,
    shipping_paise: shippingPaise,
    wallet_used_paise: walletUsedPaise,
    total_paise: totalPaise,
    cashback_earned_paise: cashbackEarnedPaise,
  };

  drawInvoicePdf(doc, orderObj, userId);

  return doc.output("datauristring").split(",")[1];
}
