import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Plan = "free" | "ideas" | "conviction" | "macro";

function normalizePlan(v: any): Plan {
  if (v === "ideas" || v === "conviction" || v === "macro") return v;
  return "free";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  try {
    const { slug } = await context.params;

    // Who is viewing?
    const supabase = await createSupabaseServerClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user ?? null;

    let viewerPlan: Plan = "free";
    let isAdmin = false;

    if (user) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("plan,is_admin")
        .eq("id", user.id)
        .maybeSingle();

      viewerPlan = normalizePlan(profile?.plan);
      isAdmin = !!profile?.is_admin;
    }

    // Always pull from ideas (admin client), but only published content:
    const { data: idea, error } = await supabaseAdmin
      .from("ideas")
      .select(
        "id,slug,title,ticker,direction,teaser,summary,conviction,macro_context,created_at,published_at,status"
      )
      .eq("slug", slug)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Only show published ideas publicly (admin can still view drafts via /admin list)
    if (idea.status !== "published" && !isAdmin) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Gate fields server-side
    const out: any = { ...idea };

    if (!isAdmin) {
      // Ideas (LEVEL I) locked unless plan >= ideas
      if (viewerPlan === "free") {
        out.summary = null;
        out.conviction = null;
        out.macro_context = null;
      }

      // Conviction (LEVEL II) locked unless plan >= conviction
      if (viewerPlan !== "conviction" && viewerPlan !== "macro") {
        out.conviction = null;
      }

      // Macro (LEVEL III) locked unless macro
      if (viewerPlan !== "macro") {
        out.macro_context = null;
      }
    }

    return NextResponse.json(
      { data: out, viewer: { plan: viewerPlan, is_admin: isAdmin } },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unknown error" }, { status: 500 });
  }
}
