import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Refreshes the Supabase auth session on every request and guards /admin.
 *
 * PERFORMANCE: Auth check (getUser) only runs on protected routes (/account, /admin).
 * Public pages (home, shop, product, etc.) skip this entirely for instant navigation.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Skip auth for /admin/upload (has its own password gate)
  if (path.startsWith("/admin/upload")) {
    return NextResponse.next({ request });
  }

  // ─── Public routes: no auth check needed ────────────────────────────────
  // Only run Supabase getUser() when navigating to protected areas.
  const isProtected = path.startsWith("/account") || path.startsWith("/admin");

  if (!isProtected) {
    return NextResponse.next({ request });
  }

  // ─── Protected routes: verify session ───────────────────────────────────
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          all: { name: string; value: string; options?: CookieOptions }[]
        ) => {
          all.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          all.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // Redirect unauthenticated users to sign-in
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Restrict /admin to admin/staff roles only
  if (path.startsWith("/admin")) {
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (!profile || !["admin", "staff"].includes(profile.role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|css|js)$).*)"],
};
