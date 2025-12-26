import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false as const, status: 401, error: "Not signed in" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { ok: false as const, status: 403, error: "Not authorized" };
  return { ok: true as const, userId: user.id };
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { data, error } = await supabaseAdmin
    .from("ideas")
    .select("id,slug,title,ticker,direction,status,created_at,published_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => ({}));

  const payload: any = {
    slug: body.slug,
    title: body.title,
    ticker: String(body.ticker ?? "").toUpperCase(),
    direction: body.direction ?? "long",
    start_date: body.start_date,
    end_date: body.end_date,
    target_price: Number(body.target_price),
    teaser: body.teaser ?? null,
    summary: body.summary ?? null,
    conviction: body.conviction ?? null,
    macro_context: body.macro_context ?? null,
    status: body.status ?? "draft",
    author_id: auth.userId,
    published_at: body.status === "published" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin.from("ideas").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
