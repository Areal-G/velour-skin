/**
 * Order history for the sample customer created by `npm run seed`.
 *
 * Rows use the column names of `public.orders` and `public.order_items` (see
 * `supabase/migrations`) and are drawn from the sample catalog, so they are
 * identical wherever they are built. Only `created_at` depends on `now`.
 */
import { getSampleCatalog } from "@/app/data/products";
import { STORE_CURRENCY } from "@/app/lib/currency";
import { calculateShipping } from "@/app/lib/pricing";
import type { OrderStatus, ShippingAddress } from "@/app/types/order";

export const SAMPLE_SHIPPING_ADDRESS: ShippingAddress = {
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
const ORDERS: Array<[number, OrderStatus, Array<[number, number, number]>]> = [
  [3, "paid", [[0, 0, 1], [5, 1, 1]]],
  [12, "fulfilled", [[2, 0, 2]]],
  [27, "fulfilled", [[8, 1, 1], [11, 0, 1], [14, 0, 1]]],
  [45, "refunded", [[3, 0, 1]]],
  [63, "fulfilled", [[20, 0, 1], [7, 0, 2]]],
  [90, "canceled", [[17, 1, 1]]],
];

const DAY_MS = 86_400_000;

export interface SampleOrderItemRow {
  product_id: string;
  product_slug: string;
  name: string;
  variant_id: string;
  variant_label: string;
  image: string;
  unit_price_cents: number;
  quantity: number;
}

export interface SampleOrderRow {
  status: OrderStatus;
  currency: string;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  shipping_address: ShippingAddress;
  created_at: string;
  items: SampleOrderItemRow[];
}

/** The sample orders, newest first, dated relative to `now` (epoch ms). */
export function buildSampleOrders(now: number): SampleOrderRow[] {
  const catalog = getSampleCatalog();
  return ORDERS.map(([daysAgo, status, picks]) => {
    const items = picks.map(([index, variantIndex, quantity]): SampleOrderItemRow => {
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
    const subtotal = items.reduce((sum, item) => sum + item.unit_price_cents * item.quantity, 0);
    const shipping = calculateShipping(subtotal);
    return {
      status,
      currency: STORE_CURRENCY.toLowerCase(),
      subtotal_cents: subtotal,
      shipping_cents: shipping,
      total_cents: subtotal + shipping,
      shipping_address: SAMPLE_SHIPPING_ADDRESS,
      created_at: new Date(now - daysAgo * DAY_MS).toISOString(),
      items,
    };
  });
}
