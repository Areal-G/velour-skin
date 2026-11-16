/**
 * Seeds a Supabase project with sample data:
 *
 *   1. the 8 categories and the 50,000-product sample catalog;
 *   2. a sample customer account with six orders (confirmed, dispatched,
 *      refunded and canceled) from the last three months.
 *
 *   npm run seed
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in `.env.local`
 * (or the environment). The customer signs in with SEED_OWNER_EMAIL and
 * SEED_OWNER_PASSWORD; against a local Supabase they default to
 * customer@example.com / velour-skin-local, while a hosted project requires
 * both to be set (otherwise the customer step is skipped).
 *
 * Safe to re-run: catalog rows are upserted by primary key, the customer is
 * created only if missing and their orders are replaced.
 * Afterwards set CATALOG_SOURCE=supabase to serve products from the database.
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "../src/app/data/categories";
import { CURATED_COUNT, getSampleCatalog } from "../src/app/data/products";
import { SAMPLE_SHIPPING_ADDRESS, buildSampleOrders } from "../src/app/data/sample-orders";
import { popularityScore } from "../src/app/lib/catalog/types";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY.");
  process.exit(1);
}

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url);
const LOCAL_DEFAULTS = { email: "customer@example.com", password: "velour-skin-local" };

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const BATCH_SIZE = 1000;

async function seedCatalog() {
  const { error: categoryError } = await supabase.from("categories").upsert(
    CATEGORIES.map((c, position) => ({ ...c, position })),
    { onConflict: "slug" },
  );
  if (categoryError) throw categoryError;
  console.log(`✓ ${CATEGORIES.length} categories`);

  const products = getSampleCatalog();
  for (let start = 0; start < products.length; start += BATCH_SIZE) {
    const rows = products.slice(start, start + BATCH_SIZE).map((p, i) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      category_slug: p.categorySlug,
      description: p.description,
      how_to_use: p.howToUse,
      ingredients: p.ingredients,
      skin_types: p.skinTypes,
      concerns: p.concerns,
      price_cents: p.priceCents,
      compare_at_cents: p.compareAtCents,
      rating: p.rating,
      review_count: p.reviewCount,
      image: p.image,
      images: p.images,
      badge: p.badge,
      in_stock: p.inStock,
      popularity: popularityScore(p, start + i < CURATED_COUNT),
      variants: p.variants,
      search_terms: [...p.concerns, ...p.skinTypes, ...p.ingredients.slice(0, 3)].join(" "),
      created_at: p.createdAt,
      updated_at: p.createdAt,
    }));
    const { error } = await supabase.from("products").upsert(rows, { onConflict: "id" });
    if (error) throw error;
    process.stdout.write(`\r✓ ${Math.min(start + BATCH_SIZE, products.length).toLocaleString()} / ${products.length.toLocaleString()} products`);
  }
  process.stdout.write("\n");
}

/** Returns the sample customer's credentials, or `null` when they must be configured. */
function customerCredentials(): { email: string; password: string } | null {
  const email = process.env.SEED_OWNER_EMAIL;
  const password = process.env.SEED_OWNER_PASSWORD;
  if (email && password) return { email, password };
  return isLocal ? LOCAL_DEFAULTS : null;
}

async function findOrCreateUser(email: string, password: string): Promise<string> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: SAMPLE_SHIPPING_ADDRESS.fullName },
  });
  if (error) throw error;
  console.log(`✓ created ${email}`);
  return data.user.id;
}

async function seedCustomer() {
  const credentials = customerCredentials();
  if (!credentials) {
    console.log("• Skipped the sample customer: set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD for a hosted project.");
    return;
  }
  const { email, password } = credentials;
  const userId = await findOrCreateUser(email, password);

  const { error: deleteError } = await supabase.from("orders").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  const orders = buildSampleOrders(Date.now());
  for (const { items, ...order } of orders) {
    const { data, error } = await supabase
      .from("orders")
      .insert({ ...order, user_id: userId, email, updated_at: order.created_at })
      .select("id")
      .single();
    if (error || !data) throw error ?? new Error("Order insert returned no row");

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(items.map((item) => ({ ...item, order_id: data.id })));
    if (itemsError) throw itemsError;
  }
  console.log(`✓ ${orders.length} orders for ${email}`);
}

async function main() {
  await seedCatalog();
  await seedCustomer();
  console.log("Done. Set CATALOG_SOURCE=supabase to serve the catalog from the database.");
}

main().catch((error) => {
  console.error("\nSeeding failed:", error.message ?? error);
  process.exit(1);
});
