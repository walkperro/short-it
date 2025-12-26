import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Plan = "free" | "ideas" | "conviction" | "macro";

function rank(plan: Plan) {
  if (plan === "macro") return 3;
  if (plan === "conviction") return 2;
  if (plan === "ideas") return 1;
  return 0;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;

  // Always fetch public-safe fields from view
  const { data: base, error: baseErr } = await supabaseAdmin
    .from("ideas_public")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (baseErr) return NextResponse.json({ error: baseErr.message }, { status: 500 });
  if (!base) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Determine plan from cookie-auth user
  let plan: Plan = "free";
  const supabase = createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();

  if (userRes.user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("plan")
      .eq("id", userRes.user.id)
      .maybeSingle();

    plan = (profile?.plan as Plan) ?? "free";
  }

  const wantIdeas = rank(plan) >= 1;
  const wantConviction = rank(plan) >= 2;
  const wantMacro = rank(plan) >= 3;

  // If free, do not touch private table.
  if (!wantIdeas && !wantConviction && !wantMacro) {
    return NextResponse.json({ data: { ...base, plan } });
  }

  // Pull gated fields from private table
  const { data: full } = await supabaseAdmin
    .from("ideas")
    .select("summary, conviction, macro_context")
    .eq("slug", slug)
    .maybeSingle();

  const payload: any = { ...base, plan };
  if (wantIdeas) payload.summary = full?.summary ?? null;
  if (wantConviction) payload.conviction = full?.conviction ?? null;
  if (wantMacro) payload.macro_context = full?.macro_context ?? null;

  return NextResponse.json({ data: payload });
}
