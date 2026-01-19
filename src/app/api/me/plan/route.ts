import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizePlan } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  // Optional: force a Stripe->Supabase plan refresh
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("sync") === "1") {
      const mod = await import("../../billing/sync/route");
      // reuse the same request; sync route reads auth from cookies
      await mod.POST(req as any);
    }
  } catch {
    // ignore
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      plan: "free",
      is_admin: false,
      user: null,
      profile: null,
    });
  }

  const email = user.email ?? null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "plan,is_admin,stripe_customer_id,stripe_subscription_id,email,agreements_version,agreements_accepted_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const is_admin = isAdminEmail(email) || Boolean(profile?.is_admin);
  const plan = normalizePlan(profile?.plan ?? "free");

  return NextResponse.json({
    user: { id: user.id, email },
    plan,
    is_admin,
    profile: profile ?? null,
  });
}
