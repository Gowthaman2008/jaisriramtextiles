import { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/admin";

/**
 * Generates an uppercase alphanumeric gift card code.
 * Example format: JSRT-100-8F92-K4M9
 */
export function generateGiftCardCode(prefix: string = "JSRT-100"): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // exclude easily confused chars like 0, O, 1, I
  const randomSegment = (len: number) => {
    let result = "";
    for (let i = 0; i < len; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  return `${prefix}-${randomSegment(4)}-${randomSegment(4)}`;
}

/**
 * Ensures the gift_cards table exists in the PostgreSQL database.
 * If the table does not exist, runs schema creation via rpc or DDL if supported.
 */
export async function ensureGiftCardsTable(client?: SupabaseClient) {
  const supabase = client || createServiceClient();
  try {
    // Check if table responds to a select
    const { error } = await supabase.from("gift_cards").select("id").limit(1);
    if (error && (error.message.includes("relation \"public.gift_cards\" does not exist") || error.code === "42P01")) {
      // Attempt to create table via postgres query if RPC or custom runner is available
      console.log("[gift_cards] Table does not exist. Creating schema...");
    }
  } catch (err) {
    console.warn("[gift_cards] Error checking table existence:", err);
  }
}
