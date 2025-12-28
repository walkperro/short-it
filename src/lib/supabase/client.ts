import { createSupabaseBrowserClient } from "./browser";

// Re-export so app code can import from "@/lib/supabase/client"
export { createSupabaseBrowserClient } from "./browser";

// Convenience singleton
export const supabase = createSupabaseBrowserClient();
