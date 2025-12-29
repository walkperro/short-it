import { redirect } from "next/navigation";
import AdminClient from "./AdminClient";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";

export const runtime = "nodejs";

export default async function AdminPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Must be logged in
  if (!user) redirect("/login");

  const email = user.email ?? null;

  // Must be admin: allowlisted email OR profiles.is_admin = true
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const ok = isAdminEmail(email) || Boolean(profile?.is_admin);
  if (!ok) redirect("/");

  return <AdminClient />;
}
