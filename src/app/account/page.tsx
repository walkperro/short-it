import ManageBillingButton from "@/components/billing/ManageBillingButton";

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { planDisplay, normalizePlan } from "@/lib/entitlements";

export const runtime = "nodejs";

export default async function AccountPage() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  if (!user) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10 text-white">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="text-lg font-semibold">You’re not signed in.</div>
          <Link
            href="/login"
            className="mt-3 inline-block text-sm text-white/70 underline underline-offset-4 hover:text-white"
          >
            Go to login
          </Link>
        </div>
      </main>
    );
  }

  const email = user.email ?? null;

  // ✅ Source of truth: profiles.plan (kept in sync by webhook + sync endpoint)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan,is_admin")
    .eq("id", user.id)
    .maybeSingle();

  const is_admin = isAdminEmail(email) || Boolean(profile?.is_admin);
  const plan = normalizePlan(profile?.plan ?? "free");
  const displayPlan = is_admin ? "macro" : plan;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10 text-white">
      <h1 className="text-4xl font-semibold tracking-tight">Account</h1>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="text-sm text-white/60">Signed in as</div>
        <div className="mt-1 text-lg font-semibold">{user.email}</div>

        <div className="mt-4 text-sm text-white/60">Plan</div>
        <div className="mt-1 text-lg font-semibold">{is_admin ? "Admin" : planDisplay(displayPlan)}</div>

        <div className="mt-6 flex flex-wrap gap-3">
          <ManageBillingButton />

          <Link
            href="/subscribe"
            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black"
          >
            Upgrade
          </Link>

          {/* ✅ must POST to the API route */}
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
