import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("convictions")
    .select("id,idea_id,status,body,created_at,published_at,ideas:idea_id(slug,idea_no,ticker,kind)")
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data ?? []).map((r: any) => ({
    id: r.id,
    idea_id: r.idea_id,
    idea_slug: r.ideas?.slug ?? null,
    idea_no: r.ideas?.idea_no ?? null,
    ticker: r.ideas?.ticker ?? null,
    kind: r.ideas?.kind ?? null,
    body: r.body ?? null,
    created_at: r.created_at,
    published_at: r.published_at ?? null,
  }));

  return NextResponse.json({ data: out });
}
