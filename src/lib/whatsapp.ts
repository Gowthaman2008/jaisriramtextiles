/**
 * WhatsApp Notification Utility for JAI SRI RAM TEXTILES
 */

export interface SendWhatsAppParams {
  phone: string;
  message: string;
}

/**
 * Clean and format phone numbers for WhatsApp API.
 * Assumes Indian numbers by default (+91) if 10 digits are provided.
 */
export function formatWhatsAppPhoneNumber(phone: string): string {
  // Strip all non-digit characters
  let cleaned = phone.replace(/\D/g, "");

  // If there's a leading 0 for 11-digit numbers, strip it (e.g., 09876543210 -> 9876543210)
  if (cleaned.length === 11 && cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // If 10 digits (common in Indian formats), prepend Indian country code 91
  if (cleaned.length === 10) {
    return `91${cleaned}`;
  }

  return cleaned;
}

/**
 * Sends a WhatsApp message using Meta Cloud API or Twilio API, or falls back to logging.
 */
export async function sendWhatsApp({ phone, message }: SendWhatsAppParams): Promise<{ success: boolean; provider: string; error?: string }> {
  const provider = (process.env.WHATSAPP_PROVIDER || "mock").toLowerCase();
  
  if (!phone) {
    return { success: false, provider, error: "Phone number is empty" };
  }

  const formattedPhone = formatWhatsAppPhoneNumber(phone);

  try {
    if (provider === "meta") {
      const accessToken = process.env.WHATSAPP_META_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_META_PHONE_NUMBER_ID;

      if (!accessToken || !phoneId) {
        console.warn("WhatsApp meta provider selected, but WHATSAPP_META_ACCESS_TOKEN or WHATSAPP_META_PHONE_NUMBER_ID is missing. Falling back to log.");
        logMockMessage(formattedPhone, message);
        return { success: true, provider: "mock-fallback", error: "Missing Meta credentials" };
      }

      const url = `https://graph.facebook.com/v17.0/${phoneId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: formattedPhone,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP error! status: ${response.status}`);
      }

      console.log(`WhatsApp message sent successfully via Meta Cloud API to: ${formattedPhone}`);
      return { success: true, provider: "meta" };

    } else if (provider === "twilio") {
      const accountSid = process.env.WHATSAPP_TWILIO_ACCOUNT_SID;
      const authToken = process.env.WHATSAPP_TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.WHATSAPP_TWILIO_FROM_NUMBER; // e.g. "whatsapp:+14155238886"

      if (!accountSid || !authToken || !fromNumber) {
        console.warn("WhatsApp twilio provider selected, but WHATSAPP_TWILIO_ACCOUNT_SID, WHATSAPP_TWILIO_AUTH_TOKEN or WHATSAPP_TWILIO_FROM_NUMBER is missing. Falling back to log.");
        logMockMessage(formattedPhone, message);
        return { success: true, provider: "mock-fallback", error: "Missing Twilio credentials" };
      }

      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
      const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

      // Format To number as whatsapp:+91xxxxxxxxxx for Twilio
      const twilioTo = `whatsapp:+${formattedPhone}`;
      // Ensure Twilio From starts with whatsapp:
      const twilioFrom = fromNumber.startsWith("whatsapp:") ? fromNumber : `whatsapp:${fromNumber}`;

      const params = new URLSearchParams();
      params.append("To", twilioTo);
      params.append("From", twilioFrom);
      params.append("Body", message);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      console.log(`WhatsApp message sent successfully via Twilio to: ${formattedPhone}`);
      return { success: true, provider: "twilio" };

    } else {
      logMockMessage(formattedPhone, message);
      return { success: true, provider: "mock" };
    }
  } catch (error: any) {
    console.error(`Failed to send WhatsApp message via ${provider}:`, error.message || error);
    return { success: false, provider, error: error.message || String(error) };
  }
}

function logMockMessage(phone: string, message: string) {
  console.log("=========================================");
  console.log(`[MOCK WHATSAPP NOTIFICATION]`);
  console.log(`To: +${phone}`);
  console.log(`Message:\n${message}`);
  console.log("=========================================");
}
