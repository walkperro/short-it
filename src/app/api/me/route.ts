import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { normalizePlan } from "@/lib/entitlements";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in
  if (!user) {
    return NextResponse.json(
      { user: null, plan: "free", is_admin: false, profile: null },
      { status: 200 }
    );
  }

  // Read user profile (RLS should allow self-select)
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const plan = normalizePlan((profile?.plan as any) ?? "free");
  const email = user.email ?? null;

  const allowlisted = isAdminEmail(email);
  const is_admin = Boolean(profile?.is_admin) || allowlisted;

  // 3B: If email is allowlisted but profile isn't marked yet, mark it now (service role)
  if (allowlisted && !profile?.is_admin) {
    await supabaseAdmin.from("profiles").upsert({
      id: user.id,
      plan,
      is_admin: true,
      updated_at: new Date().toISOString(),
    });
  }

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
