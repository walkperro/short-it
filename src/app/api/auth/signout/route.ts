import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function doSignOut(_req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();

  // send them home
  return NextResponse.redirect(new URL("/", _req.url), { status: 303 });
}

// Support both (because something is triggering GET in production)
export async function POST(req: NextRequest) {
  return doSignOut(req);
}

export async function GET(req: NextRequest) {
  return doSignOut(req);
}
