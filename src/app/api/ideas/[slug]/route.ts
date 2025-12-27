import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { slug } = await ctx.params;

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("ideas_public")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error) {
      // Helpful debugging in Vercel logs
      console.error("[api/ideas/[slug]] supabase error:", error);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (e) {
    console.error("[api/ideas/[slug]] unexpected error:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
