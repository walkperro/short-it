import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canAccess } from "@/lib/entitlements";

export const runtime = "nodejs";

type Plan = "free" | "ideas" | "conviction" | "macro";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function isAdminEmail(email?: string | null) {
  const allow = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!email && allow.includes(email.toLowerCase());
}

// simple plan resolver for now (replace later with Stripe entitlements)
function planFromEmail(email?: string | null): Plan {
  if (!email) return "free";
  return "ideas";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;

  // Viewer (cookie session)
  const supabase = await createSupabaseServerClient();
  const { data: auth } = await supabase.auth.getUser();
  const email = auth?.user?.email ?? null;

  const viewer = {
    email,
    is_admin: isAdminEmail(email),
    plan: planFromEmail(email),
  };

  // Build query first (do NOT call maybeSingle yet)
  let q = supabaseAdmin.from("ideas").select("*").eq("slug", slug);
  if (!viewer.is_admin) q = q.eq("status", "published");

  const { data, error } = await q.maybeSingle();

  if (error) {
    return NextResponse.json({ ok: false, viewer, error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ ok: false, viewer, error: "Not found" }, { status: 404 });
  }

  // Optional server-side gating (keeps UI honest)
  if (!viewer.is_admin) {
    const allowed = canAccess(viewer.plan as any, "ideas" as any);
    if (!allowed) {
      return NextResponse.json({ ok: false, viewer, error: "Upgrade required" }, { status: 402 });
    }
  }

  return NextResponse.json({ ok: true, viewer, data });
}
