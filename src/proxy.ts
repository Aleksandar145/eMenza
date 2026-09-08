import { NextResponse, type NextRequest } from "next/server";
import { isStaffPath } from "@/lib/auth-routes";
import { handleStudentClerkAuth } from "@/lib/clerk/middleware";
import { handleStaffAuth, handleStudentSupabaseAuth } from "@/lib/supabase/middleware";
import { isClerkEnabled } from "@/server/env";

export default async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Clerk ponekad redirectuje na /register%3Fkorak=2 umesto /register?korak=2
  if (pathname.includes("%3F")) {
    try {
      const decoded = decodeURIComponent(pathname);
      const [basePath, query = ""] = decoded.split("?");
      if (query) {
        const url = request.nextUrl.clone();
        url.pathname = basePath;
        url.search = `?${query}`;
        return NextResponse.redirect(url);
      }
    } catch {
      // fall through
    }
  }

  if (isStaffPath(pathname)) {
    return handleStaffAuth(request);
  }

  if (isClerkEnabled()) {
    return handleStudentClerkAuth(request);
  }

  return handleStudentSupabaseAuth(request);
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/referent/:path*",
    "/kuhinja/:path*",
    "/login",
    "/register",
    "/register/:path*",
    "/auth/:path*",
    "/sso-callback",
    "/rezervacije/:path*",
    "/kartice/:path*",
    "/podesavanja/:path*",
    "/preuzimanje/:path*",
    "/statistika/:path*",
    "/obavestenja/:path*",
    "/kreator-obroka/:path*",
    "/moj-zeton/:path*",
    "/knjiga-utisaka/:path*",
    "/ai-preporuka/:path*",
    // NE uključuj /api/* — u Next.js 16 proxy matcher na API rutama daje 404 umesto route handlera.
  ],
};
