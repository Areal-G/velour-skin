import { ProductCard } from "@/app/components/products/ProductCard";
import type { ProductSummary } from "@/app/types/product";

interface ProductGridProps {
  products: ProductSummary[];
  /** Number of leading cards whose images are preloaded (LCP candidates). */
  preloadCount?: number;
  label?: string;
}

/**
 * Products share a pool of photographs, so a page can show the same photo
 * twice. When that happens, lead with the product's second (model) image
 * instead, so every card on the page looks different.
 */
export function withDistinctImages(products: ProductSummary[]): ProductSummary[] {
  const shown = new Set<string>();
  return products.map((product) => {
    if (shown.has(product.image) && product.hoverImage && !shown.has(product.hoverImage)) {
      shown.add(product.hoverImage);
      return { ...product, image: product.hoverImage, hoverImage: product.image };
    }
    shown.add(product.image);
    return product;
  });
}

export function ProductGrid({ products, preloadCount = 0, label = "Products" }: ProductGridProps) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6"
    >
      {withDistinctImages(products).map((product, i) => (
        <li key={product.id} className="flex">
          <ProductCard product={product} preload={i < preloadCount} />
        </li>
      ))}
    </ul>
  );
}
