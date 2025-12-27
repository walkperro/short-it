import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

function slugify(input: string) {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
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

  const title = String(body.title ?? "").trim();
  const ticker = String(body.ticker ?? "").toUpperCase().trim();

  // Guarantee slug
  let slug = String(body.slug ?? "").trim();
  if (!slug) {
    const base = slugify(`${ticker || "idea"}-${title || "draft"}`) || "idea";
    slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
  } else {
    slug = slugify(slug);
  }

  const status = body.status === "published" ? "published" : "draft";
  const published_at = status === "published" ? new Date().toISOString() : null;

  const payload: any = {
    slug,
    title,
    ticker,
    direction: body.direction ?? "long",
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    target_price: Number(body.target_price) || null,
    teaser: body.teaser ?? null,
    summary: body.summary ?? null,
    conviction: body.conviction ?? null,
    macro_context: body.macro_context ?? null,
    status,
    author_id: auth.userId,
    published_at,
  };

  const { data, error } = await supabaseAdmin.from("ideas").insert(payload).select("*").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
