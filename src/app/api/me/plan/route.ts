import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ plan: "free", is_admin: false, user: null });

  const email = user.email ?? null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,is_admin,stripe_customer_id,stripe_subscription_id")
    .eq("id", user.id)
    .maybeSingle();

  const is_admin = isAdminEmail(email) || Boolean(profile?.is_admin);

  // IMPORTANT:
  // - If you're admin, treat plan as "admin" for display/unlock purposes.
  // - Otherwise use profiles.plan (Stripe webhook writes here).
  const plan = is_admin ? "admin" : (profile?.plan ?? "free");

  return NextResponse.json({
    user: { id: user.id, email },
    plan,
    is_admin,
    profile: profile ?? null,
  });
}
