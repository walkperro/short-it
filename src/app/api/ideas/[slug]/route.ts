import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const email = user.email ?? null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const is_admin = isAdminEmail(email) || Boolean(profile?.is_admin);
  const plan = profile?.plan ?? "free";

  // Ideas require at least ideas plan OR admin
  if (!is_admin && plan === "free") {
    return NextResponse.json({ error: "Upgrade required" }, { status: 403 });
  }

  const { data: idea, error } = await supabaseAdmin
    .from("ideas")
    .select("*")
    .eq("slug", params.slug)
    .single();

  if (error || !idea) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ idea });
}
