import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { messageId, message } = await request.json();

    if (!messageId || !message || !message.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminSupabase = createServiceClient();

    // Verify ownership and that ticket is not closed
    const { data: ticket, error: ticketErr } = await adminSupabase
      .from("support_messages")
      .select("status, user_id")
      .eq("id", messageId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.user_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (ticket.status === "closed") {
      return NextResponse.json({ error: "This ticket is closed and cannot be replied to" }, { status: 400 });
    }

    // Insert reply
    const { error: replyErr } = await adminSupabase
      .from("support_message_replies")
      .insert({
        message_id: messageId,
        sender_type: "user",
        message: message.trim()
      });

    if (replyErr) throw replyErr;

    // Update parent ticket status back to "new" to alert staff of a user reply
    const { error: statusErr } = await adminSupabase
      .from("support_messages")
      .update({ status: "new" })
      .eq("id", messageId);

    if (statusErr) throw statusErr;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Submit user reply error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
