import type { CartState } from "@/app/types/cart";

/**
 * The demo's starting bag: one Cashmere Cloud Cream (30 ml), matching the
 * sample catalog. Safe to import from Client Components.
 */
export const DEMO_CART: CartState = Object.freeze({
  items: [
    {
      productId: "vs-00002",
      variantId: "vs-00002-30ml",
      slug: "cashmere-cloud-cream",
      name: "Cashmere Cloud Cream",
      variantLabel: "30 ml",
      image: "/images/models/model-6.jpg",
      unitPriceCents: 5800,
      quantity: 1,
    },
  ],
}) as CartState;
