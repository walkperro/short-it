import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Plan = "free" | "ideas" | "conviction" | "macro";

function planRank(plan: Plan) {
  if (plan === "macro") return 3;
  if (plan === "conviction") return 2;
  if (plan === "ideas") return 1;
  return 0;
}

export async function GET(_req: NextRequest, ctx: { params: { slug: string } }) {
  const slug = ctx.params.slug;

  // Always start with public fields
  const { data: base, error: baseErr } = await supabaseAdmin
    .from("ideas_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (baseErr) {
    return NextResponse.json({ error: baseErr.message }, { status: 500 });
  }
  if (!base) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Determine user's plan via server session cookie
  let plan: Plan = "free";
  const supabase = createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (userRes.user) {
    const userId = userRes.user.id;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userId)
      .maybeSingle();

    plan = (profile?.plan as Plan) ?? "free";
  }

  // If plan doesn't allow extras, return base only
  if (planRank(plan) < 2) {
    return NextResponse.json({ data: { ...base, plan } });
  }

  // Fetch gated fields from the private table
  const { data: full, error: fullErr } = await supabaseAdmin
    .from("ideas")
    .select("conviction, macro_context")
    .eq("slug", slug)
    .maybeSingle();

  if (fullErr) {
    return NextResponse.json({ data: { ...base, plan } });
  }

  const payload: any = { ...base, plan };

  if (planRank(plan) >= 2) payload.conviction = full?.conviction ?? null;
  if (planRank(plan) >= 3) payload.macro_context = full?.macro_context ?? null;

  return NextResponse.json({ data: payload });
}
