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

export async function PUT(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { slug } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const patch: any = {};

  if ("status" in body) {
    patch.status = body.status === "published" ? "published" : "draft";
    patch.published_at = patch.status === "published" ? new Date().toISOString() : null;
  }
  if ("locked" in body) patch.locked = !!body.locked;
  if ("kind" in body) patch.kind = body.kind ?? null;
  if ("ticker" in body) patch.ticker = String(body.ticker || "").trim().toUpperCase() || null;
  if ("direction" in body) patch.direction = body.direction ?? null;
  if ("entry" in body) patch.entry = body.entry ?? null;
  if ("reach" in body) patch.reach = body.reach ?? null;
  if ("option_side" in body) patch.option_side = body.option_side ?? null;
  if ("context" in body) {
    patch.context = body.context ?? null;
    patch.teaser = body.context ?? null; // legacy
  }

  const { data, error } = await supabaseAdmin
    .from("ideas")
    .update(patch)
    .eq("slug", slug)
    .select("id,slug,idea_no,created_at,published_at,status,locked,kind,ticker,direction,entry,reach,option_side,context")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { slug } = await ctx.params;

  const { error } = await supabaseAdmin.from("ideas").delete().eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
