import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }
    return user;
  } catch {
    return null;
  }
}

// Shown until the admin saves their first canned response — at that point the
// table stops being empty and these fallback defaults are no longer served.
const DEFAULT_CANNED_RESPONSES = [
  "Thank you for reaching out! We've received your message and will get back to you within 24 hours.",
  "Your order has been shipped and is on its way. You'll receive tracking details shortly.",
  "We're sorry for the delay. Your order is being processed and will be dispatched within 1-2 business days.",
  "Your refund has been processed and should reflect in your account within 3-5 business days.",
  "We apologize for the inconvenience. Could you please share your Order Number so we can look into this right away?",
  "This product is currently out of stock. We expect fresh stock within the next 7-10 days — we'll notify you once it's back.",
  "Yes, this product is available for bulk/wholesale orders. Please let us know the quantity you need and we'll share pricing.",
  "Cash on Delivery is not currently available. We accept UPI, cards, and net banking via our secure checkout.",
  "Your cashback has been credited to your wallet and can be used on your next purchase.",
  "We're happy to help! Could you share a photo of the issue so we can assist you better?",
  "As per our policy, returns/replacements are only accepted if the product was received in a damaged condition.",
  "Please allow 24-48 hours for the courier to update tracking after dispatch.",
  "Your order has been successfully cancelled and the refund process has been initiated.",
  "We're sorry to hear that. We'll arrange a replacement for you right away — no extra charge.",
  "Please double check the pincode and address entered at checkout, as delivery delays are often related to serviceability in remote areas.",
  "Thank you for your patience! This has been escalated to our team and you'll hear back from us shortly.",
  "You can track your order anytime from the 'My Orders' section in your account.",
  "This item is handwoven, so slight variation in shade/texture from the photos is natural and not a defect.",
  "We currently do not offer international shipping — we deliver only within India.",
  "Thanks for shopping with us! Please don't hesitate to reach out if you need anything else.",
  "We're sorry for the mix-up. Could you confirm the item you received so we can arrange an exchange right away?",
  "Your payment appears to have failed on our end but the amount wasn't deducted — please try placing the order again.",
  "If the amount was deducted but the order wasn't placed, it will be auto-refunded by your bank within 5-7 business days.",
  "You can apply your coupon code at checkout in the 'Promotional Coupons' box just above the payment section.",
  "We're sorry, that coupon code has expired. Please check our current offers on the homepage banner.",
  "For size-related queries, please refer to the size chart on the product page, or share your usual size and we'll recommend the best fit.",
  "Please wash this item separately in cold water and avoid direct sunlight while drying to preserve the zari border.",
  "We can update your delivery address only if the order hasn't been dispatched yet. Please share your Order Number so we can check.",
  "GST invoice for your order is available for download from the 'My Orders' section, or we're happy to email it to you directly.",
  "We apologize for the damaged packaging. Could you share a photo? We'll arrange a free replacement immediately.",
  "Thank you so much for your kind review! It really means a lot to our weaving community.",
  "Our customer support is available Monday to Saturday, 9:00 AM to 7:00 PM IST.",
  "You can also reach us faster on WhatsApp using the 'Chat Now' button for urgent order queries.",
  "We currently do not offer custom stitching services — all items are sold as-is in standard sizes.",
  "Gift wrapping is not available at checkout currently, but we're working on adding this feature soon.",
  "Slight color variation between the photo and the actual product can occur due to natural dyeing processes used in handloom fabric.",
  "Your item is missing from the package? We're so sorry — please share your Order Number and we'll dispatch the missing item right away.",
  "You can cancel your order only before it has been shipped. Once shipped, please use our return/replacement process instead.",
  "We'd love to have you as a repeat customer! Keep an eye on your wallet — cashback from this order will help with your next purchase.",
  "Please try logging out and back in, or reset your password if you're having trouble accessing your account.",
  "We're sorry you're facing a login issue. Could you confirm the email address registered with your account?",
  "This product will be restocked soon — you're welcome to check back on the product page for updated availability.",
  "For wholesale/bulk orders above 50 pieces, please contact us directly via the Bulk Orders page for special pricing.",
  "Your concern has been noted and shared with our management team for review. We appreciate your patience.",
  "We sincerely apologize for the incorrect information shared earlier. Here are the correct details:",
  "Once your order is delivered, you can rate and review the product from the 'My Orders' section — we'd love to hear your feedback!",
  "Delivery timelines may vary slightly during festival season due to high courier volumes — we appreciate your patience.",
  "Your wallet cashback is valid for 12 months from the date of credit and can be used on any future purchase.",
  "We only accept prepaid orders (UPI/Card/Netbanking) at this time — Cash on Delivery is not available yet.",
  "Thank you for verifying your details! We've updated our records accordingly.",
];

// GET: list canned responses (falls back to defaults if none saved yet)
export async function GET() {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("canned_responses")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;

    if (!data || data.length === 0) {
      return NextResponse.json({
        responses: DEFAULT_CANNED_RESPONSES.map((message, i) => ({
          id: `default-${i}`,
          message,
          sort_order: i,
        })),
        isDefault: true,
      });
    }

    // Backfill any newly-added defaults that aren't in the DB yet (e.g. this list
    // grew after the table was first seeded) so older installs stay up to date.
    const existingMessages = new Set(data.map((r: any) => r.message));
    const missingDefaults = DEFAULT_CANNED_RESPONSES.filter((m) => !existingMessages.has(m));

    if (missingDefaults.length > 0) {
      const { data: inserted, error: insertErr } = await supabase
        .from("canned_responses")
        .insert(missingDefaults.map((message, i) => ({ message, sort_order: data.length + i })))
        .select();
      if (insertErr) throw insertErr;
      return NextResponse.json({ responses: [...data, ...(inserted || [])], isDefault: false });
    }

    return NextResponse.json({ responses: data, isDefault: false });
  } catch (error: any) {
    console.error("Fetch canned responses error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: add a new canned response
export async function POST(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const supabase = createServiceClient();

    // First edit/delete against the still-default list seeds all 20 defaults as
    // real rows so the specific one being changed actually has a row to act on.
    if (body.seedDefaults) {
      const { data: existing } = await supabase.from("canned_responses").select("id").limit(1);
      if (existing && existing.length > 0) {
        const { data } = await supabase.from("canned_responses").select("*").order("sort_order", { ascending: true });
        return NextResponse.json({ responses: data || [] });
      }
      const { data, error } = await supabase
        .from("canned_responses")
        .insert(DEFAULT_CANNED_RESPONSES.map((message, i) => ({ message, sort_order: i })))
        .select();
      if (error) throw error;
      return NextResponse.json({ responses: data });
    }

    const { message, sort_order } = body;
    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("canned_responses")
      .insert({ message: message.trim(), sort_order: sort_order ?? 0 })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Create canned response error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: edit an existing canned response
export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, message } = await request.json();
    if (!id || !message || !message.trim()) {
      return NextResponse.json({ error: "ID and message are required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("canned_responses")
      .update({ message: message.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Update canned response error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: remove a canned response
export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase.from("canned_responses").delete().eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete canned response error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
