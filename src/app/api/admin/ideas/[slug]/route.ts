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

function isOptionKind(kind: string | null) {
  return kind === "Buy Option" || kind === "Sell Option";
}

export async function PUT(req: Request, ctx: { params: { slug: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const slug = ctx.params.slug;
  const body = await req.json().catch(() => ({}));

  // Load existing row so we can decide when to set published_at, etc.
  const { data: existing, error: exErr } = await supabaseAdmin
    .from("ideas")
    .select("id,status,published_at,kind,start_date")
    .eq("slug", slug)
    .maybeSingle();

  if (exErr) return NextResponse.json({ error: exErr.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const kind = body?.kind ? String(body.kind) : null;
  const option = isOptionKind(kind);

  const nowIso = new Date().toISOString();

  const nextStatus: "draft" | "published" | null =
    body?.status === "draft" ? "draft" : body?.status === "published" ? "published" : null;

  const patch: any = {};

  if (typeof body?.locked === "boolean") patch.locked = body.locked;

  if (kind != null) patch.kind = kind;

  if (body?.ticker != null) patch.ticker = String(body.ticker).trim().toUpperCase();

  // Only allow direction when NOT option
  if (body?.direction !== undefined) patch.direction = option ? null : body.direction;

  if (body?.entry !== undefined) patch.entry = body.entry;
  if (body?.reach !== undefined) patch.reach = body.reach;

  // Only allow option_side when option
  if (body?.option_side !== undefined) patch.option_side = option ? body.option_side : null;

  if (body?.context !== undefined) patch.context = body.context;

  // Strike/Exp: option only
  if (body?.strike !== undefined) patch.strike = option ? body.strike : null;
  if (body?.exp !== undefined) patch.exp = option ? body.exp : null;

  // Status transitions
  if (nextStatus) {
    patch.status = nextStatus;

    // If publishing now and published_at not set, set it
    if (nextStatus === "published" && !existing.published_at) {
      patch.published_at = nowIso;
    }
    // If moving back to draft, keep published_at as-is (optional: null it; but we keep history)
  }

  // Legacy NOT NULL safety: ensure start_date always present
  if (!existing.start_date) patch.start_date = nowIso;

  const { data, error } = await supabaseAdmin
    .from("ideas")
    .update(patch)
    .eq("slug", slug)
    .select(
      "id,slug,idea_no,created_at,published_at,status,locked,kind,ticker,direction,entry,reach,option_side,context,strike,exp"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, ctx: { params: { slug: string } }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const slug = ctx.params.slug;

  const { error } = await supabaseAdmin.from("ideas").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
