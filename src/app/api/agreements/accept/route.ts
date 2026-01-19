import { NextResponse, type NextRequest } from "next/server";
import {
  createSupabaseServerClient,
  supabaseAdmin,
} from "@/lib/supabase/server";

export const runtime = "nodejs";

const FALLBACK_VERSION =
  process.env.NEXT_PUBLIC_AGREEMENTS_VERSION || "2026-01-18";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}) as any);
  const requestedVersion = (body?.version as string | undefined) ?? undefined;

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const ua = req.headers.get("user-agent") || null;

  // Resolve agreement version: request body > active agreement view > env fallback
  let version: string | null = requestedVersion ?? null;

  if (!version) {
    const { data: active, error: activeErr } = await supabaseAdmin
      .from("active_agreement")
      .select("version")
      .maybeSingle();

    if (!activeErr) version = (active as any)?.version ?? null;
  }

  version = version ?? FALLBACK_VERSION;

  // ✅ Record acceptance (source of truth for purchase gate)
  // Requires a unique constraint on (user_id, agreement_version) OR it will create duplicates.
  await supabaseAdmin.from("agreement_acceptances").upsert(
    {
      user_id: user.id,
      agreement_version: version,
      ip,
      user_agent: ua,
    },
    { onConflict: "user_id,agreement_version" },
  );

  // Optional profile mirror (handy for UI)
  await supabaseAdmin
    .from("profiles")
    .update({
      agreements_version: version,
      agreements_accepted_at: new Date().toISOString(),
      agreements_ip: ip,
      agreements_user_agent: ua,
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true, version });
}
