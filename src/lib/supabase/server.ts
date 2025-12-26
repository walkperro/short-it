import { cookies } from "next/headers";
import { createServerClient, createClient } from "@supabase/ssr";

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // ignore if called from a server component without mutating cookies
        }
      },
    },
  });
}

// Server-only admin client (Service Role) for webhooks / billing portal updates.
// IMPORTANT: Never expose SUPABASE_SERVICE_ROLE_KEY to the client.
export const supabaseAdmin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceRole);
})();
