import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { KUHINJA_DEMO_COOKIE, parseKitchenDemoCookie } from "@/lib/kuhinja-demo-session";
import {
  STUDENT_DEMO_COOKIE,
  parseStudentDemoCookie,
} from "@/lib/student-demo-session";
import {
  isStudentAuthPath,
  isStudentProtectedPath,
  staffHomeForRole,
} from "@/lib/student-routes";
import { getSupabaseAnonKey, getSupabaseUrl, isAuthEnabled } from "@/server/env";

const STAFF_PREFIXES = [
  { prefix: "/admin", role: "admin", login: "/admin/login" },
  { prefix: "/referent", role: "referent", login: "/referent/login" },
  { prefix: "/kuhinja", role: "kitchen", login: "/kuhinja/login" },
] as const;

function redirectTo(request: NextRequest, pathname: string, search?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = search ?? "";
  return NextResponse.redirect(url);
}

function createSupabaseMiddlewareClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  return { supabase, supabaseResponse };
}

export async function handleStaffAuth(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next({ request });
  }

  const { supabase, supabaseResponse } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const kitchenDemoCookie = request.cookies.get(KUHINJA_DEMO_COOKIE)?.value;
  const kitchenDemoSession = parseKitchenDemoCookie(kitchenDemoCookie);

  for (const { prefix, role, login } of STAFF_PREFIXES) {
    if (!pathname.startsWith(prefix)) {
      continue;
    }

    const hasKitchenDemoAccess = prefix === "/kuhinja" && kitchenDemoSession !== null;

    if (pathname === login) {
      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          // DB/RLS read hiccup — don't bounce an authenticated user; page-level
          // auth will surface a graceful error instead of a forced logout.
          return supabaseResponse;
        }

        if (profile?.role === role) {
          return redirectTo(request, prefix);
        }
      }

      if (prefix === "/kuhinja" && kitchenDemoCookie && !kitchenDemoSession) {
        supabaseResponse.cookies.set(KUHINJA_DEMO_COOKIE, "", { path: "/", maxAge: 0 });
      }

      return supabaseResponse;
    }

    if (!user) {
      if (hasKitchenDemoAccess) {
        return supabaseResponse;
      }

      return redirectTo(request, login);
    }

    if (hasKitchenDemoAccess) {
      return supabaseResponse;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      // Same as above: a transient DB read error must never silently sign out
      // an authenticated staff member.
      return supabaseResponse;
    }

    if (!profile || profile.role !== role) {
      return redirectTo(request, login);
    }
  }

  return supabaseResponse;
}

export async function handleStudentSupabaseAuth(request: NextRequest) {
  if (!isAuthEnabled()) {
    return NextResponse.next({ request });
  }

  const { supabase, supabaseResponse } = createSupabaseMiddlewareClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const studentDemoSession = parseStudentDemoCookie(
    request.cookies.get(STUDENT_DEMO_COOKIE)?.value,
  );
  const hasStudentDemoAccess = studentDemoSession !== null;

  if (pathname === "/login") {
    const isExplicitLogout = request.nextUrl.searchParams.get("logout") === "1";

    if (isExplicitLogout) {
      supabaseResponse.cookies.set(STUDENT_DEMO_COOKIE, "", { path: "/", maxAge: 0 });
      return supabaseResponse;
    }

    if (hasStudentDemoAccess || user) {
      if (hasStudentDemoAccess) {
        return redirectTo(request, "/");
      }

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          return supabaseResponse;
        }

        if (profile?.role === "student") {
          if (!user.email_confirmed_at) {
            return redirectTo(
              request,
              "/auth/verify-pending",
              `?email=${encodeURIComponent(user.email ?? "")}`,
            );
          }
          return redirectTo(request, "/");
        }

        if (profile?.role) {
          return redirectTo(request, staffHomeForRole(profile.role));
        }
      }
    }
  }

  if (isStudentProtectedPath(pathname)) {
    if (hasStudentDemoAccess) {
      return supabaseResponse;
    }

    if (!user) {
      const next = `${pathname}${request.nextUrl.search}`;
      return redirectTo(request, "/login", `?next=${encodeURIComponent(next)}`);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return supabaseResponse;
    }

    if (!profile || profile.role !== "student") {
      if (profile?.role) {
        return redirectTo(request, staffHomeForRole(profile.role));
      }
      return redirectTo(request, "/login");
    }

    const verifyPendingPath = "/auth/verify-pending";
    if (!user.email_confirmed_at && pathname !== verifyPendingPath) {
      return redirectTo(
        request,
        verifyPendingPath,
        `?email=${encodeURIComponent(user.email ?? "")}`,
      );
    }
  }

  if (
    isStudentAuthPath(pathname) &&
    pathname !== "/auth/verify-pending" &&
    pathname !== "/auth/forgot-password" &&
    pathname !== "/auth/reset-password" &&
    pathname !== "/auth/callback" &&
    user?.email_confirmed_at
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role === "student" && pathname.startsWith("/register")) {
      return supabaseResponse;
    }
  }

  return supabaseResponse;
}
