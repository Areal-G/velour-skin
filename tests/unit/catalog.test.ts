import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/app/data/categories";
import { CATALOG_SIZE, getSampleCatalog } from "@/app/data/products";
import { memoryCatalog } from "@/app/lib/catalog/memory";
import type { ProductQuery } from "@/app/types/product";

const query = (overrides: Partial<ProductQuery> = {}): ProductQuery => ({
  sort: "featured",
  page: 1,
  pageSize: 24,
  ...overrides,
});

describe("sample catalog", () => {
  const products = getSampleCatalog();

  it(`contains ${CATALOG_SIZE.toLocaleString()} products with unique ids and slugs`, () => {
    expect(products).toHaveLength(CATALOG_SIZE);
    expect(new Set(products.map((p) => p.id)).size).toBe(CATALOG_SIZE);
    expect(new Set(products.map((p) => p.slug)).size).toBe(CATALOG_SIZE);
  });

  it("is deterministic across calls", () => {
    expect(getSampleCatalog()[12345]).toEqual(products[12345]);
  });

  it("only uses known categories and valid, URL-safe data", () => {
    const slugs = new Set(CATEGORIES.map((c) => c.slug));
    for (const p of products.slice(0, 2000)) {
      expect(slugs.has(p.categorySlug)).toBe(true);
      expect(p.slug).toMatch(/^[a-z0-9-]+$/);
      expect(p.variants.length).toBeGreaterThan(0);
      expect(p.priceCents).toBe(p.variants[0].priceCents);
      expect(Number.isInteger(p.priceCents) && p.priceCents > 0).toBe(true);
      if (p.compareAtCents !== null) expect(p.compareAtCents).toBeGreaterThan(p.priceCents);
    }
  });
});

describe("memoryCatalog.listProducts", () => {
  it("paginates the full catalog", async () => {
    const page1 = await memoryCatalog.listProducts(query());
    const page2 = await memoryCatalog.listProducts(query({ page: 2 }));
    expect(page1.total).toBe(CATALOG_SIZE);
    expect(page1.totalPages).toBe(Math.ceil(CATALOG_SIZE / 24));
    expect(page1.items).toHaveLength(24);
    const ids = new Set(page1.items.map((p) => p.id));
    expect(page2.items.some((p) => ids.has(p.id))).toBe(false);
  });

  it("returns the last, partial page and an empty page beyond it", async () => {
    const last = Math.ceil(CATALOG_SIZE / 24);
    expect((await memoryCatalog.listProducts(query({ page: last }))).items).toHaveLength(CATALOG_SIZE % 24 || 24);
    expect((await memoryCatalog.listProducts(query({ page: last + 1 }))).items).toHaveLength(0);
  });

  it("filters by category, skin type, concern, price and stock together", async () => {
    const result = await memoryCatalog.listProducts(
      query({
        category: "serums",
        skinTypes: ["sensitive"],
        concerns: ["redness"],
        minPrice: 3_000,
        maxPrice: 6_000,
        inStock: true,
        pageSize: 100,
      }),
    );
    expect(result.total).toBeGreaterThan(0);
    for (const p of result.items) {
      expect(p.categorySlug).toBe("serums");
      expect(p.skinTypes).toContain("sensitive");
      expect(p.concerns).toContain("redness");
      expect(p.priceCents).toBeGreaterThanOrEqual(3_000);
      expect(p.priceCents).toBeLessThanOrEqual(6_000);
      expect(p.inStock).toBe(true);
    }
  });

  it.each([
    ["price-asc", (a: number, b: number) => a <= b],
    ["price-desc", (a: number, b: number) => a >= b],
  ] as const)("sorts by %s", async (sort, inOrder) => {
    const { items } = await memoryCatalog.listProducts(query({ sort, pageSize: 200 }));
    for (let i = 1; i < items.length; i++) expect(inOrder(items[i - 1].priceCents, items[i].priceCents)).toBe(true);
  });

  it("sorts newest first", async () => {
    const { items } = await memoryCatalog.listProducts(query({ sort: "newest", pageSize: 100 }));
    for (let i = 1; i < items.length; i++) expect(items[i - 1].createdAt >= items[i].createdAt).toBe(true);
  });

  it("puts hand-written hero products first in the featured order", async () => {
    const { items } = await memoryCatalog.listProducts(query());
    expect(items[0].slug).toBe("velour-renewal-serum");
  });

  it("matches every search term (AND semantics)", async () => {
    const { items, total } = await memoryCatalog.listProducts(query({ q: "vitamin c serum", pageSize: 50 }));
    expect(total).toBeGreaterThan(0);
    for (const p of items) expect(p.name.toLowerCase()).toMatch(/vitamin c/);
  });

  it("returns nothing for nonsense queries", async () => {
    expect((await memoryCatalog.listProducts(query({ q: "zzzqqqxxx" }))).total).toBe(0);
  });

  it("filters 50,000 products quickly once indexes are warm", async () => {
    await memoryCatalog.listProducts(query({ sort: "rating" }));
    const start = performance.now();
    await memoryCatalog.listProducts(query({ sort: "rating", concerns: ["hydration"], page: 300 }));
    expect(performance.now() - start).toBeLessThan(200);
  });
});

describe("memoryCatalog lookups", () => {
  it("finds products by slug and id", async () => {
    const product = await memoryCatalog.getProductBySlug("cashmere-cloud-cream");
    expect(product?.name).toBe("Cashmere Cloud Cream");
    const [byId] = await memoryCatalog.getProductsByIds([product!.id, "does-not-exist"]);
    expect(byId.slug).toBe("cashmere-cloud-cream");
    expect(await memoryCatalog.getProductBySlug("nope")).toBeNull();
  });

  it("recommends in-stock related products from the same category", async () => {
    const product = (await memoryCatalog.getProductBySlug("velour-renewal-serum"))!;
    const related = await memoryCatalog.getRelatedProducts(product, 4);
    expect(related).toHaveLength(4);
    for (const r of related) {
      expect(r.id).not.toBe(product.id);
      expect(r.categorySlug).toBe(product.categorySlug);
      expect(r.inStock).toBe(true);
    }
  });

  it("pages through sitemap entries", async () => {
    const entries = await memoryCatalog.listSitemapProducts(49_990, 100);
    expect(entries).toHaveLength(10);
    expect(await memoryCatalog.countProducts()).toBe(CATALOG_SIZE);
  });
});
