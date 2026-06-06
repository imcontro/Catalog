import { createClient } from "@supabase/supabase-js";
import { getRequiredServerEnv } from "../env";

export function createSupabaseAdminClient() {
  return createClient(
    getRequiredServerEnv("SUPABASE_URL"),
    getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export function getSupabaseStorageBucketName() {
  return getRequiredServerEnv("SUPABASE_STORAGE_BUCKET");
}
