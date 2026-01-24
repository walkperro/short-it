import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  // Find idea by slug (public-safe) then fetch conviction by idea_id
  const { data: idea, error: ideaErr } = await supabaseAdmin
    .from("ideas")
    .select("id,slug,idea_no,ticker,kind,created_at,published_at,status")
    .eq("slug", slug)
    .maybeSingle();

  if (ideaErr)
    return NextResponse.json({ error: ideaErr.message }, { status: 500 });
  if (!idea || idea.status !== "published")
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: conv, error: convErr } = await supabaseAdmin
    .from("convictions")
    .select("id,idea_id,status,body,created_at,published_at")
    .eq("idea_id", idea.id)
    .eq("status", "published")
    .maybeSingle();

  if (convErr)
    return NextResponse.json({ error: convErr.message }, { status: 500 });
  if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      id: conv.id,
      idea_id: conv.idea_id,
      body: conv.body ?? null,
      created_at: conv.created_at,
      published_at: conv.published_at ?? null,
      idea: {
        id: idea.id,
        slug: idea.slug,
        idea_no: idea.idea_no ?? null,
        ticker: idea.ticker ?? null,
        kind: idea.kind ?? null,
        created_at: idea.created_at,
        published_at: idea.published_at ?? null,
      },
    },
  });
}
