import { createClient } from "@supabase/supabase-js";

export function createMarketingSupabaseServerClient({
  environment = process.env,
  createSupabaseClient = createClient,
} = {}) {
  const url = environment.SUPABASE_URL || environment.NEXT_PUBLIC_SUPABASE_URL;
  const key = environment.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    return null;
  }

  return createSupabaseClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
