# Velour Skin

![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?logo=nextdotjs&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres_+_RLS-3ECF8E?logo=supabase&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Checkout-635BFF?logo=stripe&logoColor=white)

The online store for Velour Skin, a premium skincare brand selling in the US. It's built to carry a 50,000-product catalog without slowing down, and it runs with no configuration at all: the catalog, search, the bag and customer accounts work straight after `npm run dev`.

Built with Next.js 16.4, React 19.3, TypeScript (strict), Tailwind CSS 4 and Motion, with Supabase for accounts and orders and Stripe for payment.

## Shopping flow

This is the path a customer takes through the shop, from first visit to a finished order.

1. **The home page.** A split hero, our bestsellers, a bento grid of the eight categories, a three-step "ritual" band and a newsletter sign-up. Headlines and sections animate in gently, and stay still for anyone who has reduced motion turned on.
2. **Browsing.** The full catalog and each category page can be filtered by category, skin type, concern, price band and stock, sorted five ways and paged through. All of this works without JavaScript, too.
3. **Searching.** Search covers the whole catalog, with the same filters and sorting.
4. **A product page.** A photo gallery, size variants, quantity, which skin types and concerns it suits, how to use it and related products.
5. **The bag.** Quick add opens a slide-over bag. Delivery is $5, free over $100, and a progress bar shows how close the customer is. The bag stays in sync across browser tabs and there is a full bag page as well.
6. **Checkout.** The customer enters contact and delivery details. US states, ZIP codes and phone numbers are checked on the server.
7. **Payment.** The customer is sent to Stripe's hosted page to pay, so card details never touch our store.
8. **The order.** Back in the shop, the order shows up under **Account → Orders** with its status. Opening it shows the items, totals and delivery address.

A few things that make the shop pleasant to use along the way:

- **It's quick.** Catalog pages are cached and the static shell is served from the CDN, with anything customer-specific streamed in afterwards. Product images keep a fixed shape, so the grid never jumps while they load.
- **It works on phones.** The menu becomes a native `<dialog>`, filters move behind a **Filters** button and the grid drops to two columns.
- **It's accessible.** Landmarks and a skip link, labelled filter groups, visible focus and live regions.
- **It's findable.** Every page has its own metadata, canonical URL and Open Graph image, plus structured data and a sitemap split into 10k-URL chunks.
- **It looks the part.** Warm ivory, deep wine, soft sand and ochre, a high-contrast display face for headlines and a classic serif for product names. Light theme only for now.

## Admin

The storefront itself is for customers. Running the shop behind it works like this:

- **Orders and customers** live in Supabase. Locally, Supabase Studio runs on port 55323.
- **Order status** moves through `pending`, `paid`, `fulfilled`, `failed`, `canceled` and `refunded`. A full refund in Stripe moves the order to `refunded` automatically.
- **Catalog refresh.** Pages are cached for hours. After a product change, call `POST /api/revalidate` with the `REVALIDATE_SECRET` bearer token to refresh one product or the whole catalog, for example from a database webhook.
- **Loading the catalog.** `npm run db:seed` loads 8 categories and 50,000 products into Supabase. Set `CATALOG_SOURCE=supabase` to serve from there instead of the built-in demo catalog.
- **Demo orders.** With `DEMO_EMAIL` and `DEMO_PASSWORD` set, `npm run db:seed:demo` creates that customer and gives them six orders from the last three months (local Supabase only).

## Payments

We never trust the price that comes from the browser. The browser sends product IDs, variants and quantities, and the server does the rest:

1. Validate the bag and the delivery address.
2. Re-price every line from the catalog.
3. Save a `pending` order.
4. Send the customer to Stripe Checkout.

An order only becomes `paid` once Stripe confirms it, either through the signed webhook or a server-side check on the success page. Both go through the same set of allowed status changes, so a retried webhook or a reloaded page can't move an order backwards:

```ts
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["paid", "failed", "canceled"],
  paid: ["fulfilled", "refunded"],
  fulfilled: ["refunded"],
  failed: ["paid"],
  canceled: [],
  refunded: [],
};
```

Here is the start of that pipeline, shared by the checkout form and the JSON API:

```ts
export async function beginCheckout(input: { items: unknown; shipping: unknown }) {
  // Never take a payment we can't record.
  if (!isPaymentConfigured() || !isAdminConfigured()) {
    return { ok: false, status: 503, message: PAYMENTS_UNAVAILABLE_MESSAGE };
  }

  const items = cartLinesSchema.safeParse(input.items);
  // ...validate the address, re-price, create the pending order and the Stripe session
}
```

For a live store, add a Stripe webhook at `https://<domain>/api/webhooks/payment` with these events:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- `charge.refunded`

If orders can't be stored, checkout refuses to start, so a card is never charged without a record. Without Stripe keys, checkout says payments are not enabled instead of pretending to take money.

## Local setup

You'll need Node.js 22 (20.9 or newer works) and npm 10+.

**Just the shop**

```bash
git clone <repository-url> velour-skin
cd velour-skin
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. Every value in `.env.local` can stay empty.

**With accounts and orders (Supabase)**

```bash
npx supabase start
```

This needs Docker. It uses the included config (API on port 55321) and applies the schema. Copy the printed API URL, publishable key and secret key into `.env.local`, and add `<site-url>/auth/confirm` as a redirect URL in Supabase Auth.

**With payments (Stripe test mode)**

```bash
stripe listen --forward-to localhost:3000/api/webhooks/payment
```

Put a test key in `STRIPE_SECRET_KEY` and the printed `whsec_...` in `STRIPE_WEBHOOK_SECRET`, restart, and pay with `4242 4242 4242 4242`.

**Serving the catalog from Postgres (optional)**

```bash
npm run db:seed
```

Then set `CATALOG_SOURCE=supabase`. For a hosted Supabase project, run the migration in `supabase/migrations/` and set the same three Supabase variables.

**Where things live**

```
src/app/
  products/ categories/ search/   the catalog
  cart/ checkout/                 bag and checkout
  account/                        sign-in, orders, order detail
  api/                            checkout, payment webhook, revalidate
  lib/catalog/                    demo and Supabase catalogs
  lib/                            auth, checkout, orders, pricing, shipping
supabase/                         local config and SQL migration
scripts/                          catalog and demo-order seeders
tests/unit/ tests/e2e/            Vitest and Playwright
```

## Environment

| Name | When you need it |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production: canonical links, sitemaps, Stripe redirects |
| `AUTH_SECRET` | Shared environments (generated automatically locally) |
| `NEXT_PUBLIC_SUPABASE_URL` | Accounts and orders |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Accounts and orders |
| `SUPABASE_SECRET_KEY` | Order writes and webhooks. Server only |
| `CATALOG_SOURCE` | `demo` (default) or `supabase` |
| `STRIPE_SECRET_KEY` | Payments |
| `STRIPE_WEBHOOK_SECRET` | Payments |
| `REVALIDATE_SECRET` | Catalog refresh |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Demo order seed |

Going live on Vercel (no `vercel.json` needed):

- Use Supabase for accounts. The built-in login stores users on disk, which serverless hosting doesn't keep.
- Mark `AUTH_SECRET`, `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` and `REVALIDATE_SECRET` as sensitive.
- Set `NEXT_PUBLIC_SITE_URL` to the shop's domain.
- In Supabase Auth, set the production Site URL and the `/auth/confirm` redirect.

## Testing

```bash
npm test            # 104 unit and component tests
npm run typecheck
npm run lint
npm run test:e2e    # Playwright, desktop and mobile
npm run verify      # lint, typecheck, test and build: what CI runs
```

The unit tests cover auth, the bag, catalog filtering and sorting at full size, orders, validation and key components. The Playwright tests walk through products, sign-in and checkout. To include the Stripe redirect tests, run them against a server with test keys and `E2E_STRIPE_ENABLED=1`.

To point Playwright at a shop that's already running:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:3000 npm run test:e2e
```

CI runs lint, typecheck, unit tests with coverage and a build, then the Playwright suite in a second job.