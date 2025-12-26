import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.is_admin) return { ok: false as const, error: "Not authorized" };
  return { ok: true as const, userId: user.id };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const { data, error } = await supabaseAdmin
    .from("ideas")
    .select("id,slug,title,ticker,direction,status,created_at,published_at")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const title = (body.title ?? "").toString().trim();
  const ticker = (body.ticker ?? "").toString().trim().toUpperCase();
  const direction = (body.direction ?? "long").toString();
  const start_date = (body.start_date ?? "").toString();
  const end_date = (body.end_date ?? "").toString();
  const target_price = Number(body.target_price ?? 0);
  const teaser = (body.teaser ?? "").toString();
  const summary = (body.summary ?? "").toString();
  const conviction = (body.conviction ?? "").toString();
  const macro_context = (body.macro_context ?? "").toString();
  const status = (body.status ?? "draft").toString();

  if (!title || !ticker || !start_date || !end_date || !target_price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const slug = body.slug ? String(body.slug) : slugify(`${ticker}-${title}`);

  const payload: any = {
    slug,
    title,
    ticker,
    direction,
    start_date,
    end_date,
    target_price,
    teaser,
    summary,
    conviction,
    macro_context,
    status,
    author_id: auth.userId,
    published_at: status === "published" ? new Date().toISOString() : null,
  };

  const { data, error } = await supabaseAdmin.from("ideas").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
