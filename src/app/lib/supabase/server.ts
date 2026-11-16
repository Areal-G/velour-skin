import "server-only";
import { createDemoClient } from "@/app/lib/demo/supabase";

/**
 * Request-scoped Supabase client.
 *
 * The portfolio demo has no database: this returns the in-memory stand-in
 * (`lib/demo/supabase.ts`), which keeps the client API and treats every
 * visitor as the demo customer.
 */
export async function createClient() {
  return createDemoClient();
}
