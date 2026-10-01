import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the owner's Supabase session cookies and does the optimistic
 * redirects: /admin without a session → /login, /login as the owner → /admin.
 * This is not the security boundary. Every /admin page and Server Action
 * checks isOwner() itself. The kiosk (/) never goes through here.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return response;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const isOwner = data.user?.app_metadata?.role === "owner";
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && !data.user) {
    return redirectKeepingCookies(request, response, "/login");
  }
  if (pathname === "/login" && isOwner) {
    return redirectKeepingCookies(request, response, "/admin");
  }
  return response;
}

function redirectKeepingCookies(request: NextRequest, from: NextResponse, to: string) {
  const redirect = NextResponse.redirect(new URL(to, request.url));
  for (const cookie of from.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
