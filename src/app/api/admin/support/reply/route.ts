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

export async function PUT(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, replyMessage, action } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "Inquiry ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const updatePayload: any = {};

    if (action === "close") {
      updatePayload.status = "closed";
    } else {
      if (!replyMessage || !replyMessage.trim()) {
        return NextResponse.json({ error: "Reply message is required" }, { status: 400 });
      }

      // Insert admin reply into replies table
      const { error: replyErr } = await supabase
        .from("support_message_replies")
        .insert({
          message_id: id,
          sender_type: "admin",
          message: replyMessage.trim(),
        });
      if (replyErr) throw replyErr;

      updatePayload.reply_message = replyMessage.trim();
      updatePayload.status = "replied";
      updatePayload.replied_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("support_messages")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, message: data });
  } catch (error: any) {
    console.error("Support message reply error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await checkAdminAuth();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Inquiry ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { error } = await supabase
      .from("support_messages")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete support inquiry error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
