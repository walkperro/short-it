import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ user: null, profile: null }, { status: 200 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const plan = (profile?.plan ?? "free") as string;

  // ✅ IMPORTANT: allowlisted email counts as admin everywhere
  const is_admin = isAdminEmail(user.email) || !!profile?.is_admin;

  return NextResponse.json(
    {
      user,
      plan,
      is_admin,
      profile: { plan, is_admin },
    },
    { status: 200 }
  );
}
