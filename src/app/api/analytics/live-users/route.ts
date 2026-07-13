import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";

export const revalidate = 10; // Cache for 10 seconds

export async function GET() {
  try {
    const supabase = createServiceClient();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .gt("last_seen_at", fifteenMinutesAgo);
      
    if (error) throw error;
    
    // Fallback/Social Proof: If database has low traffic, show a realistic base number (e.g. 6)
    // to build credibility and trust.
    const liveUsers = Math.max(6, count || 0);
    
    return NextResponse.json({ count: liveUsers });
  } catch (error) {
    return NextResponse.json({ count: 8 }); // fallback
  }
}
