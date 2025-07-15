import type { SkinConcern, SkinType, SortOption } from "@/app/types/product";

export const SORT_LABELS: Record<SortOption, string> = {
  featured: "Featured",
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
};

export const SKIN_TYPE_LABELS: Record<SkinType, string> = {
  dry: "Dry",
  oily: "Oily",
  combination: "Combination",
  sensitive: "Sensitive",
  normal: "Normal",
};

export const CONCERN_LABELS: Record<SkinConcern, string> = {
  hydration: "Hydration",
  "anti-aging": "Anti-aging",
  brightening: "Brightening",
  blemishes: "Blemishes",
  redness: "Redness",
  pores: "Pores",
  firmness: "Firmness",
};

/** Price bands in whole US dollars; `undefined` means unbounded. */
export const PRICE_RANGES: Array<{ label: string; min?: number; max?: number }> = [
  { label: "Under $30", max: 30 },
  { label: "$30 – $60", min: 30, max: 60 },
  { label: "$60 – $100", min: 60, max: 100 },
  { label: "$100 and above", min: 100 },
];

export const priceRangeValue = (r: { min?: number; max?: number }) => `${r.min ?? ""}-${r.max ?? ""}`;
