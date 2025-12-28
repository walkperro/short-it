import { NextResponse } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { normalizePlan } from "@/lib/entitlements";

export const runtime = "nodejs";

function isAdminEmail(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user ?? null;

  if (!user) {
    return NextResponse.json({ user: null, is_admin: false, plan: "free" }, { status: 200 });
  }

  const email = user.email ?? null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const plan = normalizePlan(profile?.plan);
  const is_admin = Boolean(profile?.is_admin) || isAdminEmail(email);

  return NextResponse.json({ user: { id: user.id, email }, is_admin, plan }, { status: 200 });
}
