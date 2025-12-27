import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Avoid caching weirdness while you're iterating
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }

    const { data: idea, error } = await supabaseAdmin
      .from("ideas_public")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error) {
      // shows up in Vercel function logs
      console.error("ideas_public lookup error:", error);
      return NextResponse.json({ error: "Idea lookup failed" }, { status: 500 });
    }

    if (!idea) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ data: idea });
  } catch (e) {
    console.error("GET /api/ideas/[slug] failed:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
