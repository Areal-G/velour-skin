// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CartSummary } from "@/app/components/cart/CartSummary";
import { withDistinctImages } from "@/app/components/products/ProductGrid";
import { Price } from "@/app/components/ui/Price";
import { Rating } from "@/app/components/ui/Rating";
import { calculateTotals } from "@/app/lib/pricing";
import type { ProductSummary } from "@/app/types/product";

describe("<Price />", () => {
  it("announces sale and original prices to screen readers", () => {
    render(<Price amountCents={3_000} compareAtCents={3_600} />);
    expect(screen.getByText("$30")).toBeInTheDocument();
    expect(screen.getByText("$36").tagName).toBe("S");
    expect(screen.getByText("Sale price:")).toHaveClass("sr-only");
  });
});

describe("<Rating />", () => {
  it("exposes an accessible text alternative", () => {
    render(<Rating value={4.8} count={1932} />);
    expect(screen.getByRole("img", { name: "Rated 4.8 out of 5 from 1,932 reviews" })).toBeInTheDocument();
  });
});

describe("<CartSummary />", () => {
  it("shows totals and free-delivery progress", () => {
    render(<CartSummary totals={calculateTotals([{ unitPriceCents: 5_000, quantity: 1 }])} />);
    expect(screen.getByText("$5")).toBeInTheDocument();
    expect(screen.getByTestId("cart-total")).toHaveTextContent("$55");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText(/\$50 away from complimentary delivery/)).toBeInTheDocument();
  });

  it("shows complimentary delivery over the threshold", () => {
    render(<CartSummary totals={calculateTotals([{ unitPriceCents: 12_000, quantity: 1 }])} />);
    expect(screen.getByText("Complimentary")).toBeInTheDocument();
  });
});

describe("withDistinctImages", () => {
  const card = (id: string, image: string, hoverImage: string | null) =>
    ({ id, image, hoverImage }) as ProductSummary;

  it("leads with the alternate photo when the main one is already on the page", () => {
    const result = withDistinctImages([card("a", "/1.jpg", "/m1.jpg"), card("b", "/1.jpg", "/m2.jpg")]);
    expect(result.map((p) => [p.image, p.hoverImage])).toEqual([
      ["/1.jpg", "/m1.jpg"],
      ["/m2.jpg", "/1.jpg"],
    ]);
  });

  it("keeps the main photo when there is no unused alternate", () => {
    const result = withDistinctImages([card("a", "/1.jpg", null), card("b", "/1.jpg", null)]);
    expect(result.map((p) => p.image)).toEqual(["/1.jpg", "/1.jpg"]);
  });
});
