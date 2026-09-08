import { NextResponse } from "next/server";
import { resolveStudentPostVerifyPath } from "@/lib/auth-email-verify";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfileByUserId } from "@/server/auth/session";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextParam = requestUrl.searchParams.get("next");
  const origin = requestUrl.origin;

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login`);
  }

  // U zavisnosti od flow-a confirmation email moze stici sa `code` (PKCE)
  // ili vec sa postavljenom sesijom (implicit flow). Podrzavamo oba: ako
  // postoji code, pokusamo exchange; zatim uvek pokusamo getUser().
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("[auth/callback] exchangeCodeForSession error", error.message);
    }
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback`);
  }

  if (!user.email_confirmed_at) {
    return NextResponse.redirect(
      `${origin}/auth/verify-pending?email=${encodeURIComponent(user.email ?? "")}`,
    );
  }

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    return NextResponse.redirect(`${origin}/register`);
  }

  if (profile.role !== "student") {
    const staffHome =
      profile.role === "admin"
        ? "/admin"
        : profile.role === "referent"
          ? "/referent"
          : "/kuhinja";
    return NextResponse.redirect(`${origin}${staffHome}`);
  }

  return NextResponse.redirect(`${origin}${resolveStudentPostVerifyPath(nextParam)}`);
}
