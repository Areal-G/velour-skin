import { describe, expect, it } from "vitest";
import { getSampleCatalog } from "@/app/data/products";
import { buildSampleOrders } from "@/app/data/sample-orders";
import { calculateShipping } from "@/app/lib/pricing";

const NOW = Date.UTC(2026, 5, 15, 12);

describe("sample orders", () => {
  const orders = buildSampleOrders(NOW);

  it("is deterministic for a given date", () => {
    expect(buildSampleOrders(NOW)).toEqual(orders);
  });

  it("dates orders relative to now, newest first", () => {
    const times = orders.map((o) => Date.parse(o.created_at));
    expect(times[0]).toBe(NOW - 3 * 86_400_000);
    expect([...times].sort((a, b) => b - a)).toEqual(times);
  });

  it("covers the order lifecycle with consistent totals", () => {
    expect(new Set(orders.map((o) => o.status))).toEqual(new Set(["paid", "fulfilled", "refunded", "canceled"]));
    for (const order of orders) {
      const subtotal = order.items.reduce((sum, i) => sum + i.unit_price_cents * i.quantity, 0);
      expect(order.subtotal_cents).toBe(subtotal);
      expect(order.shipping_cents).toBe(calculateShipping(subtotal));
      expect(order.total_cents).toBe(subtotal + order.shipping_cents);
    }
  });

  it("uses real catalog products and variants", () => {
    const byId = new Map(getSampleCatalog().map((p) => [p.id, p]));
    for (const item of orders.flatMap((o) => o.items)) {
      const variant = byId.get(item.product_id)?.variants.find((v) => v.id === item.variant_id);
      expect(variant?.priceCents).toBe(item.unit_price_cents);
    }
  });
});
