# The offer discount is an attribute of client terms, not a promotion entity

**Status:** accepted — 2026-07-31

Coco needs admin-set discounts that change what a customer actually pays. They are two columns on `ProductClientTerms` — `discountPercent` and the market price it is advertised against — applied inside `calculateLineTotal`, the one function that turns terms plus a quantity into money. There is no `Promotion` table, no resolution step and no precedence rule: a discount is vigente exactly while the terms row that carries it is vigente, and ending an offer is closing those terms, which is already how a price change is made.

## Considered options

- **A `Promotion` entity with its own validity window, scope and priority** — the shape a discount system eventually grows into: campaigns that overlap, brand-wide percentages, an offer scheduled for next month without touching today's price. Rejected for now because it forces three decisions nothing in the product currently needs an answer to — do discounts stack, which one wins, and what the checkout snapshot freezes — and because each of them is a place the catalog price and the charged price can diverge. The terms row already carries `fromDate`/`toDate`/`active`, so it answers "when is this offer live" without a second lifecycle to keep in sync.
- **A display-only badge, charging the undiscounted price** — no risk to the money path at all. Rejected because "precio oferta" that the cart does not honour is a promise broken at the worst possible moment.
- **No discount field: lower `moqPrice` on a new terms row** — already possible today, zero schema change. Rejected because the admin then computes the percentage by hand and nothing keeps the struck-through "antes" honest; the discount is exactly the fact worth persisting.

## Consequences

- Every consumer of `calculateLineTotal` — the catalog, the client-side cart store, `cart.service`, the checkout snapshot, the Mercado Pago preference and the admin operations cart — gets the discount for free and cannot disagree about it. That is the whole reason the discount goes there and nowhere else.
- A live cart re-prices when an admin sets or clears a discount, because client terms are the live source of truth until checkout freezes them. This is not new behaviour: editing `moqPrice` has always done it. What is new is that it now happens for a merchandising reason rather than a pricing correction, so it will happen more often.
- The discount applies to `moqPrice` and `stepPrice` alike. Discounting only the MOQ block would make the marginal step more expensive than the minimum, which no one intends.
- `marketPrice` is advertising, not pricing: it never enters `calculateLineTotal`. Keeping it out is what allows it to be an unverified admin claim without contaminating an amount that gets charged.
- The day a real campaign is needed, the migration is to keep `calculateLineTotal` as the single entry point and change what feeds its discount. Nothing downstream of it has to move.
