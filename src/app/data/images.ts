/**
 * Photography used across the storefront.
 *
 * All images are from Unsplash (https://unsplash.com/license — free for
 * commercial use) and stored locally under /public/images so they are served
 * and optimized (AVIF/WebP, responsive sizes) by `next/image`. Branded
 * third-party products were deliberately excluded.
 */

const p = (name: string) => `/images/products/${name}.jpg`;
const e = (name: string) => `/images/editorial/${name}.jpg`;
const m = (n: number) => `/images/models/model-${n}.jpg`;

/** Product photography pools, keyed by category slug, mixing product and model shots. */
export const PRODUCT_IMAGES: Record<string, string[]> = {
  serums: [...["serum-1", "serum-2", "serum-3", "serum-4", "serum-5", "serum-6", "serum-7", "serum-8"].map(p), m(3), m(10), m(11)],
  moisturizers: [...["cream-1", "cream-2", "cream-3", "cream-4", "cream-5", "cream-6", "cream-7"].map(p), m(5), m(6), m(8)],
  cleansers: [...["cleanser-1", "cleanser-4", "cleanser-3", "body-1"].map(p), m(1), m(12)],
  toners: [...["toner-1", "toner-2", "toner-3", "serum-5"].map(p), m(7), m(9)],
  masks: [...["mask-1", "mask-4", "mask-3", "cream-3"].map(p), m(2), m(8)],
  "eye-care": [...["serum-2", "cream-4", "serum-5", "cream-2"].map(p), m(7), m(10)],
  body: [...["body-1", "body-2", "body-5", "body-4"].map(p), m(4), m(9), m(5)],
  suncare: [...["cleanser-3", "texture-2", "cleanser-4"].map(p), m(2), m(3), m(12)],
};

/**
 * Model portraits used as the hover / second gallery image. Unsplash photo IDs,
 * in order: 1609535895148-cf9f5c446290, 1613876215075-276fd62c89a4,
 * 1632765866070-3fadf25d3d5b, 1644152993066-9b9ee687930d, 1654967073950-2293abdf1c5b,
 * 1654969586352-f2a6dbbd1ea9, 1664293344021-6e960f2df71b, 1693004927824-f2623bbedc8b,
 * 1765607476283-ca2d8201ddd4, 1776790376585-4a12803b2b8c, 1784979196798-343ea0234ece,
 * 1784979196882-11b8a119e2fe.
 */
export const MODEL_IMAGES = Array.from({ length: 12 }, (_, i) => m(i + 1));

/** Close-up texture shots used as the secondary gallery image. */
export const TEXTURE_IMAGES = ["texture-1", "texture-2", "texture-3"].map(p);

export const EDITORIAL = {
  heroPortrait: e("hero-glow"),
  heroProduct: e("hero-product"),
  ritual: e("ritual"),
  profile: e("profile-braids"),
  serumApply: e("cream-apply"),
  glow: e("warm-glow"),
  clayMask: e("mask-apply"),
  natural: e("curls"),
} as const;

/** Picks a stable image from a pool for a given index. */
export function imageFor(pool: string[], index: number): string {
  return pool[((index % pool.length) + pool.length) % pool.length];
}
