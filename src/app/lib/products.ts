import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { CATEGORIES, CATEGORY_BY_SLUG } from "@/app/data/categories";
import { memoryCatalog } from "@/app/lib/catalog/memory";
import type { Category } from "@/app/types/category";
import type { ProductQuery } from "@/app/types/product";

/**
 * Cached catalog facade used by every page.
 *
 * Results are cached with `"use cache"` (Next.js Cache Components) so listing
 * and product pages are prerendered into the static shell and revalidated in
 * the background (ISR). Data can also be invalidated on demand via the
 * `products` tag — see `src/app/api/revalidate/route.ts`.
 */

export const PRODUCTS_TAG = "products";

export async function getProducts(query: ProductQuery) {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  return memoryCatalog.listProducts(query);
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG, `product:${slug}`);
  return memoryCatalog.getProductBySlug(slug);
}

export async function getFeaturedProducts(limit = 8) {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  return memoryCatalog.getFeaturedProducts(limit);
}

export async function getNewArrivals(limit = 8) {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  const result = await memoryCatalog.listProducts({ sort: "newest", page: 1, pageSize: limit, inStock: true });
  return result.items;
}

export async function getRelatedProducts(slug: string, limit = 4) {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  const product = await memoryCatalog.getProductBySlug(slug);
  return product ? memoryCatalog.getRelatedProducts(product, limit) : [];
}

/** Slugs of the most popular products, prerendered at build time. */
export async function getPopularProductSlugs(limit: number) {
  "use cache";
  cacheLife("days");
  cacheTag(PRODUCTS_TAG);
  const products = await memoryCatalog.getFeaturedProducts(limit);
  return products.map((p) => p.slug);
}

export async function countProducts() {
  "use cache";
  cacheLife("days");
  cacheTag(PRODUCTS_TAG);
  return memoryCatalog.countProducts();
}

export async function getSitemapProducts(offset: number, limit: number) {
  "use cache";
  cacheLife("days");
  cacheTag(PRODUCTS_TAG);
  return memoryCatalog.listSitemapProducts(offset, limit);
}

/**
 * Uncached lookup for checkout. Prices must be read fresh from the source of
 * truth at the moment of payment, never from a cache or from the client.
 */
export function getProductsForCheckout(ids: string[]) {
  return memoryCatalog.getProductsByIds(ids);
}

export async function getCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function getCategory(slug: string): Promise<Category | null> {
  return CATEGORY_BY_SLUG.get(slug) ?? null;
}
