import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlan } from "@/lib/entitlements";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) return NextResponse.json({ plan: "free" }, { status: 200 });

  // admin gets full access anyway
  if (isAdminEmail(user.email)) {
    return NextResponse.json({ plan: "macro" }, { status: 200 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const plan = normalizePlan(profile?.plan ?? "free");
  return NextResponse.json({ plan }, { status: 200 });
}
