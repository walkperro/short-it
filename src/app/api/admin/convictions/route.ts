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

export async function GET(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status"); // "draft" | "published"

  let q = supabaseAdmin
    .from("convictions")
    .select("id,idea_id,status,body,created_at,published_at,ideas:idea_id(id,slug,idea_no,ticker,kind)")
    .order("created_at", { ascending: false });

  if (status === "draft" || status === "published") q = q.eq("status", status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const out = (data ?? []).map((r: any) => ({
    id: r.id,
    idea_id: r.idea_id,
    idea_slug: r.ideas?.slug ?? null,
    idea_no: r.ideas?.idea_no ?? null,
    ticker: r.ideas?.ticker ?? null,
    kind: r.ideas?.kind ?? null,
    status: r.status,
    body: r.body ?? null,
    created_at: r.created_at,
    published_at: r.published_at ?? null,
  }));

  return NextResponse.json({ data: out });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.ok) return NextResponse.json({ error: "Not authorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const idea_id = body?.idea_id ? String(body.idea_id) : "";
  if (!idea_id) return NextResponse.json({ error: "idea_id required" }, { status: 400 });

  const status: "draft" | "published" = body?.status === "published" ? "published" : "draft";
  const nowIso = new Date().toISOString();

  const payload: any = {
    idea_id,
    status,
    body: body?.body ?? null,
    author_id: admin.user.id,
    published_at: status === "published" ? nowIso : null,
  };

  // Upsert by unique(idea_id): create or replace conviction for this idea
  const { data, error } = await supabaseAdmin
    .from("convictions")
    .upsert([payload], { onConflict: "idea_id" })
    .select("id,idea_id,status,body,created_at,published_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
