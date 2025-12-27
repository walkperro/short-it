import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  // Public list: do NOT return conviction/macro fields here.
  const { data, error } = await supabaseAdmin
    .from("ideas_public")
    .select("id,slug,title,ticker,direction,teaser,created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
