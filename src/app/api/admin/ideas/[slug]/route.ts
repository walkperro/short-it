import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient, supabaseAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

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
  return { ok: true as const };
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { slug } = await context.params;
  const body = await req.json().catch(() => ({}));

  const patch: any = {};
  if (typeof body.conviction === "string") patch.conviction = body.conviction;
  if (typeof body.macro_context === "string") patch.macro_context = body.macro_context;
  if (typeof body.summary === "string") patch.summary = body.summary;
  if (typeof body.teaser === "string") patch.teaser = body.teaser;

  if (typeof body.status === "string") {
    patch.status = body.status === "published" ? "published" : "draft";
    patch.published_at = patch.status === "published" ? new Date().toISOString() : null;
  }

  const { data, error } = await supabaseAdmin
    .from("ideas")
    .update(patch)
    .eq("slug", slug)
    .select("*")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true, data });
}
