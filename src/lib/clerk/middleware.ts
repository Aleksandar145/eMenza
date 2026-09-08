import { NextResponse, type NextRequest } from "next/server";
import {
  STUDENT_DEMO_COOKIE,
  parseStudentDemoCookie,
} from "@/lib/student-demo-session";
import { isStudentAuthPath, isStudentProtectedPath } from "@/lib/student-routes";
import { hasSupabaseStudentSession } from "@/lib/supabase/student-session-middleware";
import { isBackendEnabled } from "@/server/env";

function redirectTo(request: NextRequest, pathname: string, search?: string) {
  const url = request.nextUrl.clone();

  const queryIndex = pathname.indexOf("?");
  if (queryIndex !== -1) {
    url.pathname = pathname.slice(0, queryIndex);
    url.search = pathname.slice(queryIndex);
  } else {
    url.pathname = pathname;
    if (search) {
      url.search = search.startsWith("?") ? search : `?${search}`;
    } else {
      url.search = "";
    }
  }

  return NextResponse.redirect(url);
}

function hasLikelyClerkSession(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => {
    return (
      name === "__session" ||
      name.startsWith("__session_") ||
      name.startsWith("__clerk") ||
      name === "__client_uat"
    );
  });
}

export async function handleStudentClerkAuth(request: NextRequest) {
  if (!isBackendEnabled()) {
    return NextResponse.next({ request });
  }

  const pathname = request.nextUrl.pathname;
  const studentDemoSession = parseStudentDemoCookie(
    request.cookies.get(STUDENT_DEMO_COOKIE)?.value,
  );
  const hasStudentDemoAccess = studentDemoSession !== null;

  if (pathname === "/login") {
    const isExplicitLogout = request.nextUrl.searchParams.get("logout") === "1";

    if (isExplicitLogout) {
      const response = NextResponse.next({ request });
      response.cookies.set(STUDENT_DEMO_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }
  }

  if (isStudentAuthPath(pathname) || pathname === "/sso-callback") {
    return NextResponse.next({ request });
  }

  const hasClerkSession = hasLikelyClerkSession(request);

  if (isStudentProtectedPath(pathname)) {
    if (hasStudentDemoAccess) {
      return NextResponse.next({ request });
    }

    if (!hasClerkSession) {
      const hasSupabaseStudent = await hasSupabaseStudentSession(request);
      if (!hasSupabaseStudent) {
        const next = `${pathname}${request.nextUrl.search}`;
        return redirectTo(request, "/login", `?next=${encodeURIComponent(next)}`);
      }
    }
  }

  return NextResponse.next({ request });
}
