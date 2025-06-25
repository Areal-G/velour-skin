Velour Skin
===========

Our online shop for premium skincare, selling across the US.

The store
---------

- A home page with bestsellers, shop-by-category tiles and a newsletter sign-up
- The full catalog plus eight category pages (serums and the rest)
- Filters for skin type, concern, price and stock
- Product pages with sizes, how-to-use notes and related products
- A bag that slides in from the side; delivery is $5, free over $100
- Customer accounts with order history
- Card payments through Stripe

Running the shop locally
------------------------

You'll need Node.js 22 and npm.

    npm install
    cp .env.example .env.local
    npm run dev

Then open http://localhost:3000.

- Every value in `.env.local` can stay empty; the shop runs on a built-in demo catalog
- Checkout says payments are not enabled until Stripe keys are added
- Accounts work out of the box and are stored locally