import { describe, expect, it } from "vitest";
import { createCartStore } from "@/app/cart-store";
import { getSampleCatalog } from "@/app/data/products";
import { DEMO_CART } from "@/app/lib/demo/cart";
import type { CartItem } from "@/app/types/cart";

const [seed] = DEMO_CART.items;

/** What the provider builds on every page load in the demo. */
const pageLoad = () => createCartStore(null, DEMO_CART);

const serum: Omit<CartItem, "quantity"> = {
  productId: "vs-00001",
  variantId: "vs-00001-15ml",
  slug: "velour-renewal-serum",
  name: "Velour Renewal Serum",
  variantLabel: "15 ml",
  image: "/images/products/serum-1.jpg",
  unitPriceCents: 6800,
};

describe("demo bag", () => {
  it("starts with one in-stock catalog item at its catalog price", () => {
    expect(DEMO_CART.items).toHaveLength(1);
    const product = getSampleCatalog().find((p) => p.id === seed.productId);
    const variant = product?.variants.find((v) => v.id === seed.variantId);
    expect(product).toMatchObject({ slug: seed.slug, name: seed.name, image: seed.image, inStock: true });
    expect(variant).toMatchObject({ label: seed.variantLabel, priceCents: seed.unitPriceCents });
    expect(seed.quantity).toBe(1);
  });

  it("renders the same bag on the server and during hydration", () => {
    const store = pageLoad();
    expect(store.getServerSnapshot()).toBe(DEMO_CART);
    expect(store.getSnapshot()).toBe(store.getServerSnapshot());
  });

  it("supports adding, changing and removing items within a page load", () => {
    const store = pageLoad();
    store.dispatch({ type: "add", item: serum });
    store.dispatch({ type: "setQuantity", variantId: seed.variantId, quantity: 3 });
    expect(store.getSnapshot().items.map((i) => [i.variantId, i.quantity])).toEqual([
      [seed.variantId, 3],
      [serum.variantId, 1],
    ]);

    store.dispatch({ type: "remove", variantId: seed.variantId });
    store.dispatch({ type: "remove", variantId: serum.variantId });
    expect(store.getSnapshot().items).toEqual([]);
  });

  it("resets to the starting item on the next page load", () => {
    const first = pageLoad();
    first.dispatch({ type: "clear" });
    first.dispatch({ type: "add", item: serum, quantity: 2 });

    expect(pageLoad().getSnapshot()).toBe(DEMO_CART);
    expect(DEMO_CART.items).toEqual([seed]);
    expect(seed.quantity).toBe(1);
  });
});
