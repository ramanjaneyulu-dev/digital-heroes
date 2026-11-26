// Supabase client that uses the SECRET key. It BYPASSES Row Level Security.
// Only use it in trusted server code (webhooks, payment handling, draw publishing).
// Never import this file from a Client Component.
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
