import { createServiceClient } from "@/lib/supabase/admin";

export interface RecipientContext {
  userId?: string | null;
  email: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  totalOrders?: number;
  totalSpendingRupees?: number;
  lastOrderDate?: string;
  couponCode?: string;
}

export function substituteMergeTags(
  template: string,
  context: RecipientContext,
  options: {
    campaignId?: string;
    recipientId?: string;
    siteUrl?: string;
  } = {}
): string {
  const { campaignId = "", recipientId = "", siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in" } = options;

  let text = template;

  const defaultUnsubscribeUrl = `${siteUrl}/unsubscribe?email=${encodeURIComponent(context.email)}${campaignId ? `&cid=${campaignId}` : ""}${recipientId ? `&rid=${recipientId}` : ""}`;

  const values: Record<string, string> = {
    first_name: context.firstName || "Valued Customer",
    last_name: context.lastName || "",
    email: context.email || "",
    city: context.city || "your city",
    state: context.state || "India",
    total_orders: String(context.totalOrders || 0),
    total_spending: `₹${(context.totalSpendingRupees || 0).toLocaleString("en-IN")}`,
    last_order_date: context.lastOrderDate || "Recently",
    coupon_code: context.couponCode || "FESTIVE10",
    unsubscribe_link: defaultUnsubscribeUrl,
    store_name: "JAI SRI RAM TEXTILES",
  };

  // Replace default syntax like {{first_name | default: "Customer"}} or {{first_name}}
  text = text.replace(/\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*default:\s*["']([^"']*)["'])?\s*\}\}/g, (_, key, fallback) => {
    const val = values[key];
    if (val !== undefined && val !== "") return val;
    if (fallback !== undefined) return fallback;
    return "";
  });

  return text;
}

export function injectTracking(
  html: string,
  options: {
    campaignId: string;
    recipientId: string;
    enableOpenTracking?: boolean;
    enableClickTracking?: boolean;
    siteUrl?: string;
  }
): string {
  const { campaignId, recipientId, enableOpenTracking = true, enableClickTracking = true, siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://jaisriramtextiles.in" } = options;

  let processedHtml = html;

  // 1. Click tracking: rewrite <a href="..."> tags
  if (enableClickTracking && campaignId && recipientId) {
    processedHtml = processedHtml.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi, (match, quote, url) => {
      // Do not rewrite mailto:, tel:, #, or unsubscribe links
      if (
        url.startsWith("mailto:") ||
        url.startsWith("tel:") ||
        url.startsWith("#") ||
        url.includes("/api/marketing/track/") ||
        url.includes("/unsubscribe")
      ) {
        return match;
      }

      const trackingUrl = `${siteUrl}/api/marketing/track/click?c=${encodeURIComponent(campaignId)}&r=${encodeURIComponent(recipientId)}&url=${encodeURIComponent(url)}`;
      return match.replace(url, trackingUrl);
    });
  }

  // 2. Open tracking: append invisible 1x1 GIF before </body>
  if (enableOpenTracking && campaignId && recipientId) {
    const openPixelUrl = `${siteUrl}/api/marketing/track/open?c=${encodeURIComponent(campaignId)}&r=${encodeURIComponent(recipientId)}&t=${Date.now()}`;
    const pixelImg = `<img src="${openPixelUrl}" alt="" width="1" height="1" border="0" style="display:none;width:1px;height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;" />`;

    if (processedHtml.includes("</body>")) {
      processedHtml = processedHtml.replace("</body>", `${pixelImg}\n</body>`);
    } else {
      processedHtml += `\n${pixelImg}`;
    }
  }

  return processedHtml;
}

export async function sendMarketingEmail({
  to,
  subject,
  html,
  fromName,
  fromEmail,
  replyTo,
  tags,
}: {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const systemFrom = process.env.RESEND_FROM_EMAIL || "Jai Sri Ram Textiles <onboarding@resend.dev>";
  const configuredFrom =
    fromName && fromEmail && fromEmail.includes("@")
      ? `${fromName} <${fromEmail}>`
      : systemFrom;

  // Basic email syntax check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to.trim())) {
    return {
      success: false,
      error: `Invalid recipient email address: "${to}". Please check for typos.`,
    };
  }

  // If no Resend API key is configured, log in test simulation mode
  if (!apiKey) {
    console.warn(`[Marketing Simulation] RESEND_API_KEY not configured. Mocking email send to ${to}. Subject: "${subject}"`);
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    };
  }

  const sendPayload = async (fromAddress: string) => {
    const payload: any = {
      from: fromAddress,
      to: to.trim(),
      subject,
      html,
    };

    if (replyTo) {
      payload.reply_to = replyTo;
    }

    if (tags && tags.length > 0) {
      payload.tags = tags;
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  try {
    let { res, data } = await sendPayload(configuredFrom);

    // If domain verification failed for custom from domain, fallback to system verified sender
    if (!res.ok && data?.message && (data.message.includes("domain is not verified") || data.message.includes("validation_error")) && configuredFrom !== systemFrom) {
      console.warn(`[Marketing] Custom domain not verified on Resend (${configuredFrom}), falling back to system sender: ${systemFrom}`);
      const fallbackResult = await sendPayload(systemFrom);
      res = fallbackResult.res;
      data = fallbackResult.data;
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.message || `Email delivery failed (HTTP ${res.status}): ${res.statusText}`,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Failed to communicate with email delivery service",
    };
  }
}
