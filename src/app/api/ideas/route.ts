import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from("ideas_public")
    .select("id,slug,idea_no,status,locked,created_at,published_at,kind,ticker,direction,entry,reach,option_side,context,strike,exp")
    .order("published_at", { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}
