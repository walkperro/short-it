'use server';
import { createClient } from "@/lib/supabase/server";
export async function signUp(email: string, password: string) {
  const supabase = createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: `${origin}/auth/confirmed` },
  });
  return { error: error?.message ?? null };
}
