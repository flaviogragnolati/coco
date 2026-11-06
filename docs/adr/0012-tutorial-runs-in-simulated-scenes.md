# The tutorial plays in simulated scenes over example data, never on the real pages

**Status:** accepted — 2026-11-06

The customer tutorial walks a whole purchase, from the catalog to the last journey stage, including stages no customer has lived yet. It runs at its own route, `/tutorial`, outside the storefront layout. Each step renders a scene built from the storefront's real presentational components (product card, mini-cart, cart, checkout steps, order journey) fed by a fixed fixture dataset, and a spotlight walks over it. The real pages never know a tutorial exists: they don't branch on a tutorial mode, don't swap their data sources, and don't host the tour. Where a real screen keeps its markup inside a data-bound container, that markup is extracted into a pure view (`CartSheetView`, `CartPageView`, `OrderDetailView`), and the page and the tutorial render it alike.

Source: `docs/plans/customer-tutorial.md`.

## Considered options

- **The real pages in a tutorial mode** (`/products`, `/cart`, `/checkout`, `/my-orders` switch their tRPC queries and the cart store to mocks while the tour runs). It looks the most faithful, and it is the usual way tours are built. Rejected because every data-bound container needs a branch, and the cases that matter are the riskiest ones. The cart store persists to localStorage and syncs with the server, so one missed guard writes example items into a customer's real cart. My orders and the order detail are fetched on the server, so they would have to be rebuilt to accept mocks. A mistake in this mode corrupts real data, while a mistake in a separate scene only shows a wrong picture.
- **Hybrid: the real catalog, simulated screens after it.** Rejected: the script would depend on whatever the live catalog holds (empty, reordered or repriced), and the tour would change route halfway.
- **A tour library driving the real DOM** (driver.js, react-joyride). It doesn't settle the data question on its own, and it adds a second source of truth for the current step next to React state. The engine is built in-house on Radix.

## Consequences

- `/tutorial` must never mount the cart machinery (`CartNavButton`, `CartSheet`, `useCartActions`, `useCartStore` writers) or issue tRPC requests. An e2e test checks that the real cart's localStorage entry is unchanged after a tour.
- The scenes can drift from the real pages. Two things limit it: pure components and extracted views are shared rather than copied, and every fixture parses through the real zod output schemas, so a schema change fails the tests instead of rendering "-". The shells that are recomposed rather than shared (the simulated navbar, the catalog layout, the checkout shell) are the known drift surface. Review them when those pages change.
- A screen added to the purchase path needs a scene before it can appear in the tutorial. If its markup lives in a data-bound container, the first step is extracting a pure view.
- The tutorial can show states the system can't produce on demand (every journey stage, a delivered order) without seeding data or touching any environment.
