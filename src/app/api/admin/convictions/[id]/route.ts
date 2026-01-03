import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, user: null };

  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!prof?.is_admin) return { ok: false as const, user: null };
  return { ok: true as const, user };
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const nowIso = new Date().toISOString();

  const patch: any = {};
  if (body?.body !== undefined) patch.body = body.body ?? null;

  const nextStatus: "draft" | "published" | null =
    body?.status === "draft" ? "draft" : body?.status === "published" ? "published" : null;

  if (nextStatus) {
    patch.status = nextStatus;
    patch.published_at = nextStatus === "published" ? nowIso : null;
  }

  const { data, error } = await supabaseAdmin
    .from("convictions")
    .update(patch)
    .eq("id", id)
    .select("id,idea_id,status,body,created_at,published_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { error } = await supabaseAdmin.from("convictions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
