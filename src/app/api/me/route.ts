import { NextResponse } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  const user = data.user;
  if (!user) {
    return NextResponse.json({ user: null, plan: "free", is_admin: false });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,is_admin,email")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({
    user: { id: user.id, email: user.email },
    plan: profile?.plan ?? "free",
    is_admin: !!profile?.is_admin,
  });
}
