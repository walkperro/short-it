import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut().catch(() => {});
  return NextResponse.json({ ok: true });
}
