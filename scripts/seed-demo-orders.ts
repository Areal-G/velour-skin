/**
 * Seeds a demo customer with a realistic order history for local walkthroughs.
 *
 *   npm run db:seed:demo
 *
 * Local-only: requires NEXT_PUBLIC_SUPABASE_URL (pointing at localhost),
 * SUPABASE_SECRET_KEY, DEMO_EMAIL and DEMO_PASSWORD in `.env.local`.
 * Creates the demo user if it does not exist yet, then replaces that user's
 * orders with a fixed set drawn from the demo catalog. Safe to re-run.
 */
import { existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { getDemoCatalog } from "../src/app/data/products";
import { calculateShipping } from "../src/app/lib/pricing";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.env.DEMO_EMAIL;
const password = process.env.DEMO_PASSWORD;
if (!url || !key || !email || !password) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, DEMO_EMAIL or DEMO_PASSWORD.");
  process.exit(1);
}
if (!/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(url)) {
  console.error("Refusing to seed demo orders into a non-local Supabase project.");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const ADDRESS = {
  fullName: "Adaeze Okafor",
  line1: "245 W 17th St",
  line2: "Apt 4B",
  city: "New York",
  state: "NY",
  postcode: "10011",
  country: "US",
  phone: "+12125550147",
};

// [days ago, status, [catalog index, variant index, quantity][]]
const ORDERS: Array<[number, string, Array<[number, number, number]>]> = [
  [3, "paid", [[0, 0, 1], [5, 1, 1]]],
  [12, "fulfilled", [[2, 0, 2]]],
  [27, "fulfilled", [[8, 1, 1], [11, 0, 1], [14, 0, 1]]],
  [45, "refunded", [[3, 0, 1]]],
  [63, "fulfilled", [[20, 0, 1], [7, 0, 2]]],
  [90, "canceled", [[17, 1, 1]]],
];

async function findOrCreateUser(): Promise<string> {
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const match = data.users.find((u) => u.email?.toLowerCase() === email!.toLowerCase());
    if (match) return match.id;
    if (data.users.length < 200) break;
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email: email!,
    password: password!,
    email_confirm: true,
    user_metadata: { full_name: ADDRESS.fullName },
  });
  if (error) throw error;
  console.log(`✓ created ${email}`);
  return data.user.id;
}

async function main() {
  const userId = await findOrCreateUser();
  const catalog = getDemoCatalog();

  const { error: deleteError } = await supabase.from("orders").delete().eq("user_id", userId);
  if (deleteError) throw deleteError;

  for (const [daysAgo, status, picks] of ORDERS) {
    const items = picks.map(([index, variantIndex, quantity]) => {
      const product = catalog[index];
      const variant = product.variants[Math.min(variantIndex, product.variants.length - 1)];
      return {
        product_id: product.id,
        product_slug: product.slug,
        name: product.name,
        variant_id: variant.id,
        variant_label: variant.label,
        image: product.image,
        unit_price_cents: variant.priceCents,
        quantity,
      };
    });
    const subtotal = items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
    const shipping = calculateShipping(subtotal);
    const createdAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        email,
        status,
        currency: "usd",
        subtotal_cents: subtotal,
        shipping_cents: shipping,
        total_cents: subtotal + shipping,
        shipping_address: ADDRESS,
        created_at: createdAt,
        updated_at: createdAt,
      })
      .select("id")
      .single();
    if (error || !order) throw error;

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(items.map((i) => ({ ...i, order_id: order.id })));
    if (itemsError) throw itemsError;
  }
  console.log(`✓ ${ORDERS.length} orders for ${email}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
