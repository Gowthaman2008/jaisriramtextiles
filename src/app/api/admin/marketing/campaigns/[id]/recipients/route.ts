import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "all";
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const exportCsv = url.searchParams.get("export") === "true";

    const supabase = createServiceClient();

    let query = supabase
      .from("email_campaign_recipients")
      .select("*", { count: "exact" })
      .eq("campaign_id", id)
      .order("created_at", { ascending: true });

    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (exportCsv) {
      const { data: allRecipients } = await query;
      const rows = allRecipients || [];

      let csv = "Recipient Email,Name,Status,Sent At,Delivered At,Opened At,Clicked At,Error Message\n";
      rows.forEach((r: any) => {
        csv += `"${r.email || ""}","${r.name || ""}","${r.status || ""}","${r.sent_at || ""}","${r.delivered_at || ""}","${r.opened_at || ""}","${r.clicked_at || ""}","${(r.error_message || "").replace(/"/g, '""')}"\n`;
      });

      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="campaign-${id}-recipients.csv"`,
        },
      });
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: recipients, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      recipients: recipients || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
