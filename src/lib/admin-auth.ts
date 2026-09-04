import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";

export interface AdminAuthUser {
  id: string;
  email?: string;
  role: "admin" | "staff";
}

/**
 * Verifies that the incoming request is authenticated with an active session
 * and belongs to an administrator or staff member.
 */
export async function checkAdminAuth(): Promise<AdminAuthUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const adminClient = createServiceClient();
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "staff"].includes(profile.role)) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: profile.role as "admin" | "staff",
    };
  } catch {
    return null;
  }
}

/**
 * Checks if the request contains a valid CRON_SECRET or is authenticated by an Admin/Staff member.
 */
export async function checkAdminOrCronAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || process.env.MARKETING_CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return { isCron: true, role: "cron" as const };
  }

  const adminUser = await checkAdminAuth();
  if (adminUser) {
    return { isCron: false, user: adminUser, role: adminUser.role };
  }

  return null;
}
