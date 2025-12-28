import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/account";

  // IMPORTANT: use the *current request* origin so cookies land on the right domain
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  const supabase = await createSupabaseServerClient();

  // Exchange the code for a session (sets auth cookies)
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, origin));
  }

  return NextResponse.redirect(new URL(next, origin));
}
