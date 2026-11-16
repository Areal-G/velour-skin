import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Privileged Supabase client for trusted writes (orders, payment webhooks,
 * newsletter sign-ups). The portfolio demo has no database, so it is never
 * configured: checkout and the newsletter show their "not available" notices
 * and every caller checks `isAdminConfigured()` before writing.
 */
export function isAdminConfigured(): boolean {
  return false;
}

export function createAdminClient(): SupabaseClient {
  throw new Error("The demo has no database, so trusted writes are disabled");
}
