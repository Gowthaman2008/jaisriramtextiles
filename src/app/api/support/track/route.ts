import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Query ID is required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from("support_messages")
      .select("id, name, email, subject, message, status, reply_message, replied_at, created_at")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: "No inquiry found with this ID. Please check the spelling or format." }, { status: 404 });
    }

    // Fetch replies for this message
    const { data: replies } = await supabase
      .from("support_message_replies")
      .select("*")
      .eq("message_id", id)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      ...data,
      replies: replies || [],
    });
  } catch (error: any) {
    console.error("Track support message error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
