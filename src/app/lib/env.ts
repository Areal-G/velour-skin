/**
 * Centralized, typed access to environment configuration.
 *
 * Only `NEXT_PUBLIC_*` values are ever read in client bundles. Secret keys are
 * read exclusively from server-only modules (`lib/payment.ts`), which import
 * `server-only` to guarantee they can never be bundled for the browser.
 */

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, "");
}

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  // Vercel preview deployments should link to themselves, not production.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
