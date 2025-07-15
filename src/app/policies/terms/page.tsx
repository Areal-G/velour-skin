import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/app/components/layout/PolicyPage";
import { buildMetadata } from "@/app/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Terms of sale",
  description: "The terms that apply when you purchase from Velour Skin.",
  path: "/policies/terms",
});

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of sale" path="/policies/terms" updated="15 October 2026">
      <p>
        These terms apply to orders placed on this website. By placing an order you agree to them.
      </p>
      <h2>Prices and payment</h2>
      <p>
        All prices are shown in US dollars ($). Prices are confirmed on our servers at
        the moment you check out; payment is taken securely by our payment provider. Your order is confirmed
        only once payment has been successfully authorized.
      </p>
      <h2>Delivery</h2>
      <p>
        We deliver to all 50 states and the District of Columbia. Delivery is free on orders of $100 or more; otherwise a
        flat $5 nationwide delivery fee applies.
      </p>
      <h2>Cancellations and returns</h2>
      <p>
        You may return unopened items
        within 14 days of delivery. See our <Link href="/policies/returns">delivery and returns policy</Link> for
        details.
      </p>
      <h2>Product information</h2>
      <p>
        Our products are cosmetics and are not intended to diagnose, treat or prevent any medical condition.
        Always patch test new skincare and read the packaging before use.
      </p>
    </PolicyPage>
  );
}
