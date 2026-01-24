import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false as const, user: null };

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof?.is_admin) return { ok: false as const, user: null };
  return { ok: true as const, user };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 64);
}

function isOptionKind(kind: string | null) {
  return kind === "Buy Option" || kind === "Sell Option";
}

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // "draft" | "published"

  let q = supabaseAdmin
    .from("ideas")
    .select(
      "id,slug,idea_no,created_at,published_at,status,locked,kind,ticker,direction,entry,reach,option_side,context,strike,exp",
    )
    .order("created_at", { ascending: false });

  if (status === "draft" || status === "published") q = q.eq("status", status);

  const { data, error } = await q;
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok)
    return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));

  const ticker = String(body?.ticker || "")
    .trim()
    .toUpperCase();
  const kind = body?.kind ? String(body.kind) : null;
  const locked = !!body?.locked;
  const status: "draft" | "published" =
    body?.status === "published" ? "published" : "draft";

  const direction = body?.direction ? String(body.direction) : null;
  const entry = body?.entry ?? null;
  const reach = body?.reach ?? null;
  const option_side = body?.option_side ? String(body.option_side) : null;
  const context = body?.context ? String(body.context) : null;

  const strike = body?.strike ?? null;
  const exp = body?.exp ? String(body.exp) : null;

  if (!ticker)
    return NextResponse.json({ error: "Ticker required" }, { status: 400 });

  const option = isOptionKind(kind);
  const nowIso = new Date().toISOString();

  // Enforce: strike/exp only allowed when option kind
  const finalStrike = option ? strike : null;
  const finalExp = option ? exp : null;

  const baseSlug = slugify(`${ticker}-${Date.now()}`);
  const published_at = status === "published" ? nowIso : null;

  const { data, error } = await supabaseAdmin
    .from("ideas")
    .insert([
      {
        slug: baseSlug,
        ticker,
        kind,
        direction: option ? null : direction,
        entry,
        reach,
        option_side: option ? option_side : null,
        context,
        locked,
        status,
        published_at,
        start_date: nowIso, // legacy NOT NULL safety
        strike: finalStrike,
        exp: finalExp,

        author_id: admin.user.id,
        // legacy display fields
        title: `Idea ${ticker}`,
        teaser: context,
      },
    ])
    .select(
      "id,slug,idea_no,created_at,published_at,status,locked,kind,ticker,direction,entry,reach,option_side,context,strike,exp",
    )
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
