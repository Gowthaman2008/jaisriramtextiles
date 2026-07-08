import { formatINR } from "@/lib/utils";
import { jsPDF } from "jspdf";
import { drawInvoicePdf } from "@/lib/invoice-generator";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL || "Jai Sri Ram Textiles <no-reply@jaisriramtextiles.in>";

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
      .trust-badge-bar {
        background-color: #1A1612 !important;
        background-image: linear-gradient(#1A1612, #1A1612) !important;
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

// Helper: Common AJIO Header
function renderEmailHeader(title: string, subtitle?: string) {
  return `
    <!-- Header Block -->
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #1A1612; padding: 22px 24px; border-bottom: 4px solid #B08D4C;">
      <tr>
        <td style="vertical-align: middle;">
          <div style="color: #B08D4C; font-family: 'Times New Roman', Georgia, serif; font-size: 20px; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase;">JAI SRI RAM</div>
          <div style="color: #FFFFFF; font-family: Arial, sans-serif; font-size: 8px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; opacity: 0.85;">Premium Handlooms</div>
        </td>
        <td align="right" style="vertical-align: middle; font-family: Arial, sans-serif; text-align: right;">
          <div style="color: #FFFFFF; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${title}</div>
          ${subtitle ? `<div style="color: #B08D4C; font-size: 10px; font-weight: bold; margin-top: 3px; font-family: monospace;">${subtitle}</div>` : ""}
        </td>
      </tr>
    </table>
  `;
}

// Helper: Common AJIO Footer with trust badges
function renderEmailFooter() {
  return `
    <!-- Please Note Disclaimer -->
    <div style="padding: 24px 28px; background-color: #F7F5EE; border-top: 1px solid #E5DFD2; font-family: Arial, sans-serif; font-size: 11.5px; color: #6E655A; line-height: 1.6;">
      <p style="margin: 0 0 8px 0; font-weight: bold; color: #2A2622; text-transform: uppercase; letter-spacing: 0.5px; font-size: 11px;">Please Note:</p>
      <p style="margin: 0 0 10px 0;">We never request payment details, OTPs, or wallet passwords over the phone or email. Please do not share security credentials with anyone claiming to represent Jai Sri Ram Textiles.</p>
      <p style="margin: 0;">Have questions or feedback? Reply directly to this email or reach us at <a href="mailto:support@jaisriramtextiles.in" style="color: #B08D4C; text-decoration: none; font-weight: bold;">support@jaisriramtextiles.in</a>.</p>
    </div>

    <!-- Trust Badges Footer Bar -->
    <table class="trust-badge-bar" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #1A1612; padding: 18px 20px; text-align: center; border-radius: 0 0 12px 12px;">
      <tr>
        <td style="color: #E5DFD2; font-family: Arial, sans-serif; font-size: 10.5px; width: 33%;">
          <div style="font-size: 14px; margin-bottom: 2px;">🌟</div>
          <b>Assured Quality</b><br/><span style="color: #9A9084; font-size: 9px;">100% Handloom Woven</span>
        </td>
        <td style="color: #E5DFD2; font-family: Arial, sans-serif; font-size: 10.5px; width: 33%; border-left: 1px solid #2A2622; border-right: 1px solid #2A2622;">
          <div style="font-size: 14px; margin-bottom: 2px;">📦</div>
          <b>Hand-Picked & Packed</b><br/><span style="color: #9A9084; font-size: 9px;">Inspected Combed Cotton</span>
        </td>
        <td style="color: #E5DFD2; font-family: Arial, sans-serif; font-size: 10.5px; width: 33%;">
          <div style="font-size: 14px; margin-bottom: 2px;">🔄</div>
          <b>Easy Exchange</b><br/><span style="color: #9A9084; font-size: 9px;">Friendly Customer Care</span>
        </td>
      </tr>
    </table>
  `;
}

interface OrderItemLine {
  name: string;
  variant?: string | null;
  unit_price_paise: number;
  quantity: number;
  image_url?: string | null;
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
    .map((item) => {
      const imgHtml = item.image_url 
        ? `<td style="padding: 12px 8px 12px 12px; width: 60px; vertical-align: top;"><img src="${item.image_url}" alt="" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px; border: 1px solid #E5DFD2;" /></td>`
        : `<td style="padding: 12px 8px 12px 12px; width: 60px; vertical-align: top;"><div style="width: 50px; height: 50px; background-color: #F5F2EB; border-radius: 4px; border: 1px solid #E5DFD2; display: flex; align-items: center; justify-content: center; color: #9A9084; font-size: 16px;">📦</div></td>`;
      
      return `
        <tr style="border-bottom: 1px solid #E5DFD2;">
          ${imgHtml}
          <td style="padding: 12px 8px; vertical-align: top; font-family: Arial, sans-serif;">
            <div style="font-weight: bold; color: #2A2622; font-size: 13px; line-height: 1.4;">${item.name}</div>
            <div style="color: #6E655A; font-size: 11px; margin-top: 4px;">
              ${item.variant ? `<b>Variant:</b> ${item.variant} &nbsp;|&nbsp; ` : ""}
              <b>Qty:</b> ${item.quantity}
            </div>
          </td>
          <td style="padding: 12px 12px 12px 8px; text-align: right; vertical-align: top; font-family: Arial, sans-serif; font-weight: bold; color: #2A2622; font-size: 13px;">
            ${formatINR(item.unit_price_paise * item.quantity, true)}
          </td>
        </tr>
      `;
    })
    .join("");
}

export function welcomeEmailHtml({ name, email, provider }: { name?: string; email: string; provider: string }) {
  return `
    <div class="email-bg" style="background-color: #F5F2EB; padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; border: 1px solid #E5DFD2; border-radius: 12px; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        ${renderEmailHeader("Welcome Abroad", "Account Created")}
        
        <div style="padding: 32px 32px 24px 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi <b>${name || "there"}</b>,</p>
          <p style="margin: 0 0 20px 0;">
            Welcome to JAI SRI RAM TEXTILES! Your customer account has been created successfully. You are now ready to explore our premium collection of handloom garments.
          </p>

          <!-- Details Card -->
          <div style="padding: 16px 20px; background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; margin: 24px 0;">
            <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; color: #6E655A; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #E5DFD2; padding-bottom: 6px;">
              Your Account Details
            </div>
            <table style="width: 100%; font-size: 13px; font-family: Arial, sans-serif; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; color: #6E655A; border-bottom: 1px solid #F5F2EB;">Email</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #2A2622; border-bottom: 1px solid #F5F2EB;">${email}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6E655A; border-bottom: 1px solid #F5F2EB;">Provider</td>
                <td style="padding: 6px 0; font-weight: bold; text-transform: capitalize; text-align: right; color: #2A2622; border-bottom: 1px solid #F5F2EB;">${provider}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #6E655A;">Registered On</td>
                <td style="padding: 6px 0; font-weight: bold; text-align: right; color: #2A2622;">${new Date().toLocaleString("en-IN", { dateStyle: "long" })}</td>
              </tr>
            </table>
          </div>

          <p style="margin: 20px 0 0 0;">
            We manufacture and curate only the finest dhotis, absorbent handloom towels, and sustainable jute bags directly from our looms in Komarapalayam, Namakkal district, Tamil Nadu.
          </p>
        </div>

        ${renderEmailFooter()}
      </div>
    </div>
  `;
}

export function passwordResetEmailHtml({ name, resetLink }: { name?: string; resetLink: string }) {
  return `
    <div class="email-bg" style="background-color: #F5F2EB; padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; border: 1px solid #E5DFD2; border-radius: 12px; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        ${renderEmailHeader("Security", "Password Reset")}
        
        <div style="padding: 32px 32px 24px 32px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 16px 0;">Hi <b>${name || "there"}</b>,</p>
          <p style="margin: 0 0 24px 0;">
            We received a request to reset your password. Click the action button below to select a new secure password.
          </p>

          <div style="margin: 28px 0; text-align: center;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 32px; background-color: #1A1612; color: #B08D4C; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; border: 1px solid #B08D4C; font-family: Arial, sans-serif; box-shadow: 0 2px 8px rgba(26, 22, 18, 0.25);">
              Reset Password
            </a>
          </div>

          <p style="color: #6E655A; font-size: 12.5px; margin: 24px 0 0 0; line-height: 1.5; font-family: Arial, sans-serif;">
            If you did not request a password change, you can safely ignore this email. This link is single-use and will automatically expire in 2 hours.
          </p>
        </div>

        ${renderEmailFooter()}
      </div>
    </div>
  `;
}

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
  const cleanOrderNumber = String(orderNumber || "").startsWith("JSRT") ? String(orderNumber) : `JSRT-${orderNumber}`;
  
  return `
    <div class="email-bg" style="background-color: #F5F2EB; padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; border: 1px solid #E5DFD2; border-radius: 12px; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        ${renderEmailHeader("Order Confirmed", cleanOrderNumber)}
        
        <div style="padding: 28px 24px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 12px 0;">Hi <b>${name || "Customer"}</b>,</p>
          <p style="margin: 0 0 20px 0;">Your order has been placed and is now being processed. Thank you for shopping with us! Here is your purchase invoice summary.</p>
          
          <!-- Order details Strip (AJIO box style) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
              <tr>
                <td style="padding: 4px 0; color: #6E655A; width: 60%;">Order ID</td>
                <td style="padding: 4px 0; font-weight: bold; color: #B08D4C; text-align: right;">${cleanOrderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6E655A;">Order Placed</td>
                <td style="padding: 4px 0; font-weight: bold; color: #2A2622; text-align: right;">${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
              </tr>
              ${userId ? `
              <tr>
                <td style="padding: 4px 0; color: #6E655A;">Customer Registry ID</td>
                <td style="padding: 4px 0; font-weight: bold; color: #2A2622; text-align: right; font-family: monospace;">${userId}</td>
              </tr>` : ""}
            </table>
          </div>

          <!-- Items delivered box (AJIO style) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <div style="background-color: #F7F5EE; padding: 10px 16px; font-weight: bold; font-size: 12px; color: #2A2622; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E5DFD2;">
              Item(s) Ordered
            </div>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tbody>
                ${itemRowsHtml(items)}
              </tbody>
            </table>

            <!-- Table Totals summary -->
            <table cellpadding="0" cellspacing="0" border="0" width="240px" style="margin-left: auto; margin-right: 12px; font-size: 12.5px; font-family: Arial, sans-serif; margin-top: 14px; margin-bottom: 14px; line-height: 1.7;">
              <tr>
                <td style="color: #6E655A;">Sub Total</td>
                <td align="right" style="font-weight: bold; color: #2A2622;">${formatINR(subtotalPaise, true)}</td>
              </tr>
              ${discountPaise > 0 ? `
              <tr>
                <td style="color: #A24B3E;">Coupon Discount</td>
                <td align="right" style="font-weight: bold; color: #A24B3E;">-${formatINR(discountPaise, true)}</td>
              </tr>` : ""}
              ${walletUsedPaise > 0 ? `
              <tr>
                <td style="color: #A24B3E;">Wallet Redemption</td>
                <td align="right" style="font-weight: bold; color: #A24B3E;">-${formatINR(walletUsedPaise, true)}</td>
              </tr>` : ""}
              <tr>
                <td style="color: #6E655A;">Standard Delivery</td>
                <td align="right" style="font-weight: bold; color: #2A2622;">${shippingPaise === 0 ? "FREE" : formatINR(shippingPaise, true)}</td>
              </tr>
              <tr style="border-top: 1px solid #B08D4C;">
                <td style="padding-top: 6px; font-weight: bold; color: #B08D4C; font-size: 14px;">Total Amount</td>
                <td align="right" style="padding-top: 6px; font-weight: bold; color: #B08D4C; font-size: 14px;">${formatINR(totalPaise, true)}</td>
              </tr>
              ${cashbackEarnedPaise > 0 ? `
              <tr>
                <td style="color: #4B7A52; font-size: 11.5px; padding-top: 2px;">Cashback Credited</td>
                <td align="right" style="font-weight: bold; color: #4B7A52; font-size: 11.5px; padding-top: 2px;">+${formatINR(cashbackEarnedPaise, true)}</td>
              </tr>` : ""}
            </table>
          </div>

          <!-- Billing address and Mode of Payment (stacked for mobile compatibility) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; padding: 16px; font-family: Arial, sans-serif; font-size: 12.5px; margin-bottom: 16px;">
            <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; color: #6E655A; margin-bottom: 8px; border-bottom: 1px solid #F5F2EB; padding-bottom: 4px;">Delivery Address</div>
            <div style="font-weight: bold; font-size: 13.5px; color: #2A2622; margin-bottom: 4px;">${shippingAddress.recipient}</div>
            <div style="color: #2A2622; line-height: 1.5;">
              ${shippingAddress.line1}${shippingAddress.line2 ? ", " + shippingAddress.line2 : ""}<br/>
              ${shippingAddress.city}${shippingAddress.district ? ", " + shippingAddress.district : ""}, ${shippingAddress.state} - ${shippingAddress.pincode}<br/>
              <b>Mobile:</b> ${shippingAddress.phone || "N/A"}
            </div>
          </div>

          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; padding: 16px; font-family: Arial, sans-serif; font-size: 12.5px; margin-bottom: 16px;">
            <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; color: #6E655A; margin-bottom: 8px; border-bottom: 1px solid #F5F2EB; padding-bottom: 4px;">Mode of Payment</div>
            <div style="font-weight: bold; font-size: 13.5px; color: #B08D4C; margin-bottom: 4px;">PREPAID</div>
            <div style="color: #6E655A; line-height: 1.5;">
              Secure Gateway (Debit/Credit/UPI). Invoice PDF is attached to this email.
            </div>
          </div>

          <p style="font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
            We will send a status notification once your items have shipped. Meanwhile, stay bold, stay stylish!
          </p>
        </div>

        ${renderEmailFooter()}
      </div>
    </div>
  `;
}

export function orderDeliveredEmailHtml({
  orderNumber,
  name,
  items,
  totalPaise,
  trackingId,
}: {
  orderNumber: string;
  name?: string;
  items: OrderItemLine[];
  totalPaise: number;
  trackingId?: string | null;
}) {
  const cleanOrderNumber = String(orderNumber || "").startsWith("JSRT") ? String(orderNumber) : `JSRT-${orderNumber}`;

  return `
    <div class="email-bg" style="background-color: #F5F2EB; padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; border: 1px solid #E5DFD2; border-radius: 12px; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        ${renderEmailHeader("Order Delivered", cleanOrderNumber)}
        
        <div style="padding: 28px 24px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 12px 0;">Hi <b>${name || "Customer"}</b>,</p>
          <p style="margin: 0 0 20px 0;">Great news — your order has been successfully delivered at the given address. We hope you enjoy your new handloom garments!</p>

          <!-- Order details Strip (AJIO box style) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
              <tr>
                <td style="padding: 4px 0; color: #6E655A; width: 60%;">Order ID</td>
                <td style="padding: 4px 0; font-weight: bold; color: #B08D4C; text-align: right;">${cleanOrderNumber}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6E655A;">Delivery Date</td>
                <td style="padding: 4px 0; font-weight: bold; color: #2A2622; text-align: right;">${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #6E655A;">Courier Partner</td>
                <td style="padding: 4px 0; font-weight: bold; color: #2A2622; text-align: right;">SHADOWFAX</td>
              </tr>
              ${trackingId ? `
              <tr>
                <td style="padding: 4px 0; color: #6E655A;">Tracking ID</td>
                <td style="padding: 4px 0; font-weight: bold; color: #B08D4C; text-align: right; font-family: monospace;">${trackingId}</td>
              </tr>` : ""}
            </table>
          </div>

          <!-- Items delivered box (AJIO style) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <div style="background-color: #F7F5EE; padding: 10px 16px; font-weight: bold; font-size: 12px; color: #2A2622; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E5DFD2;">
              Item(s) Delivered
            </div>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tbody>
                ${itemRowsHtml(items)}
              </tbody>
            </table>

            <!-- Table Totals summary -->
            <table cellpadding="0" cellspacing="0" border="0" width="240px" style="margin-left: auto; margin-right: 12px; font-size: 12.5px; font-family: Arial, sans-serif; margin-top: 14px; margin-bottom: 14px; line-height: 1.7;">
              <tr style="border-top: 1px solid #B08D4C;">
                <td style="padding-top: 6px; font-weight: bold; color: #B08D4C; font-size: 14.5px;">Total Paid</td>
                <td align="right" style="padding-top: 6px; font-weight: bold; color: #B08D4C; font-size: 14.5px;">${formatINR(totalPaise, true)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
            Meanwhile, stay bold, stay stylish! Thank you for buying local and supporting handloom weavers!
          </p>
        </div>

        ${renderEmailFooter()}
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
  const cleanOrderNumber = String(orderNumber || "").startsWith("JSRT") ? String(orderNumber) : `JSRT-${orderNumber}`;

  return `
    <div class="email-bg" style="background-color: #F5F2EB; padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; border: 1px solid #E5DFD2; border-radius: 12px; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        ${renderEmailHeader("Refund Processed", cleanOrderNumber)}
        
        <div style="padding: 28px 24px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 12px 0;">Hi <b>${name || "Customer"}</b>,</p>
          <p style="margin: 0 0 20px 0;">We have successfully processed a refund for your order. Here is your transaction summary.</p>

          <!-- Refund Summary Box (AJIO styled table) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; padding: 18px 20px; margin-bottom: 24px;">
            <div style="font-weight: bold; font-size: 12px; text-transform: uppercase; color: #6E655A; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #E5DFD2; padding-bottom: 6px; font-family: Arial, sans-serif;">
              Refund Transaction Summary
            </div>
            <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12.5px; line-height: 1.8; table-layout: fixed;">
              <colgroup>
                <col style="width: 42%;" />
                <col style="width: 58%;" />
              </colgroup>
              <tr>
                <td style="color: #6E655A; border-bottom: 1px solid #F5F2EB; padding: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Original Paid Amount</td>
                <td style="font-weight: bold; text-align: right; color: #2A2622; border-bottom: 1px solid #F5F2EB; padding: 4px 0;">${formatINR(totalPaidPaise, true)}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; color: #4B7A52; border-bottom: 1px solid #F5F2EB; font-size: 13px; padding: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Refunded Value</td>
                <td style="font-weight: bold; color: #4B7A52; text-align: right; border-bottom: 1px solid #F5F2EB; font-size: 13px; padding: 4px 0;">${formatINR(refundAmountPaise, true)}</td>
              </tr>
              ${transactionId ? `
              <tr>
                <td style="color: #6E655A; border-bottom: 1px solid #F5F2EB; padding: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Bank Transaction ID</td>
                <td style="font-family: monospace; font-weight: bold; text-align: right; color: #2A2622; border-bottom: 1px solid #F5F2EB; padding: 4px 0; word-break: break-all; word-wrap: break-word;">${transactionId}</td>
              </tr>` : ""}
              <tr>
                <td style="color: #6E655A; border-bottom: 1px solid #F5F2EB; padding: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Refund Date</td>
                <td style="font-weight: bold; text-align: right; color: #2A2622; border-bottom: 1px solid #F5F2EB; padding: 4px 0;">${new Date().toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
              </tr>
              ${note ? `
              <tr>
                <td style="color: #6E655A; padding-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Admin Note</td>
                <td style="font-style: italic; text-align: right; color: #2A2622; padding-top: 4px; word-break: break-all; word-wrap: break-word;">${note}</td>
              </tr>` : ""}
            </table>
            ${screenshotUrl ? `
            <div style="margin-top: 16px; text-align: center; border-top: 1px solid #F5F2EB; padding-top: 14px;">
              <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; color: #6E655A; margin-bottom: 8px; font-family: Arial, sans-serif;">Refund Proof Receipt</div>
              <a href="${screenshotUrl}" target="_blank">
                <img src="${screenshotUrl}" alt="Refund Proof" style="max-width: 100%; max-height: 240px; object-fit: contain; border: 1px solid #E5DFD2; border-radius: 4px;" />
              </a>
              <div style="margin-top: 8px;">
                <a href="${screenshotUrl}" target="_blank" style="color: #B08D4C; font-size: 11.5px; text-decoration: none; font-weight: bold; font-family: Arial, sans-serif;">
                  Open Original Image ↗
                </a>
              </div>
            </div>` : ""}
          </div>

          <!-- Items delivered box (AJIO style) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <div style="background-color: #F7F5EE; padding: 10px 16px; font-weight: bold; font-size: 12px; color: #2A2622; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E5DFD2;">
              Itemized Order details
            </div>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tbody>
                ${itemRowsHtml(items)}
              </tbody>
            </table>
          </div>

          <p style="font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
            The refund value is credited back to your original source of payment. Depending on banking channels, the credits should reflect in your bank account statements in 3 to 5 working days.
          </p>
        </div>

        ${renderEmailFooter()}
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
  const cleanOrderNumber = String(orderNumber || "").startsWith("JSRT") ? String(orderNumber) : `JSRT-${orderNumber}`;

  return `
    <div class="email-bg" style="background-color: #F5F2EB; padding: 40px 16px; font-family: Georgia, 'Times New Roman', serif;">
      <div class="email-card" style="max-width: 560px; margin: 0 auto; background-color: #FBF9F4; border: 1px solid #E5DFD2; border-radius: 12px; box-shadow: 0 4px 15px rgba(42, 38, 34, 0.05); overflow: hidden;">
        ${renderEmailHeader("Order Cancelled", cleanOrderNumber)}
        
        <div style="padding: 28px 24px; color: #2A2622; font-size: 14px; line-height: 1.6;">
          <p style="font-size: 16px; margin: 0 0 12px 0;">Hi <b>${name || "Customer"}</b>,</p>
          <p style="margin: 0 0 20px 0;">We regret to inform you that your order has been cancelled and rejected by our team.</p>

          ${rejectionReason ? `
          <!-- Rejection Message Box -->
          <div style="padding: 14px 18px; background-color: #FDF2F2; border: 1px solid #F8D7DA; border-radius: 6px; color: #721C24; font-size: 12.5px; font-family: Arial, sans-serif; margin-bottom: 20px; line-height: 1.5;">
            <strong>Reason for cancellation:</strong> ${rejectionReason}
          </div>
          ` : ""}

          <!-- Refund Notice Card -->
          <div style="padding: 16px; background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #B08D4C; font-family: Arial, sans-serif; font-size: 12.5px; line-height: 1.5;">
            <div style="font-weight: bold; color: #B08D4C; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-size: 11.5px;">Refund Policy Notice</div>
            <div style="color: #6E655A;">Any prepaid payment will be automatically refunded back to the original source in 24 hours. A transaction notification email will follow.</div>
          </div>

          <!-- Items delivered box (AJIO style) -->
          <div style="background-color: #FFFFFF; border: 1px solid #E5DFD2; border-radius: 8px; overflow: hidden; margin-bottom: 24px;">
            <div style="background-color: #F7F5EE; padding: 10px 16px; font-weight: bold; font-size: 12px; color: #2A2622; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E5DFD2;">
              Cancelled Item details
            </div>
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse;">
              <tbody>
                ${itemRowsHtml(items)}
              </tbody>
            </table>

            <!-- Table Totals summary -->
            <table cellpadding="0" cellspacing="0" border="0" width="240px" style="margin-left: auto; margin-right: 12px; font-size: 12.5px; font-family: Arial, sans-serif; margin-top: 14px; margin-bottom: 14px; line-height: 1.7;">
              <tr style="border-top: 1px solid #B08D4C;">
                <td style="padding-top: 6px; font-weight: bold; color: #B08D4C; font-size: 14px;">Total Cancelled</td>
                <td align="right" style="padding-top: 6px; font-weight: bold; color: #B08D4C; font-size: 14px;">${formatINR(totalPaise, true)}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
            We apologize for any inconvenience caused. If you have questions or would like to request alternative products, reply to this email or speak to us directly.
          </p>
        </div>

        ${renderEmailFooter()}
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
