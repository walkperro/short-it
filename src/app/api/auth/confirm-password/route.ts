import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();

  // Must already be signed in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}) as any);
  const password = (body?.password as string | undefined) ?? "";

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password required" }, { status: 400 });
  }

  // Re-authenticate by signing in again with same email + password.
  // This is the only reliable way to verify the password with Supabase auth.
  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
