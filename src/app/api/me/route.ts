import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { user: null, plan: "free", is_admin: false, profile: null },
      { status: 200 }
    );
  }

  const email = user.email ?? null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,is_admin,stripe_customer_id,stripe_subscription_id,email")
    .eq("id", user.id)
    .maybeSingle();

  const is_admin = isAdminEmail(email) || Boolean(profile?.is_admin);
  const plan = (profile?.plan ?? "free") as string;

  return NextResponse.json(
    {
      user: { id: user.id, email },
      plan,
      is_admin,
      profile: profile ?? { plan, is_admin },
    },
    { status: 200 }
  );
}
