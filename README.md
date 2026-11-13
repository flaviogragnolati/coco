# Create T3 App

This is a [T3 Stack](https://create.t3.gg/) project bootstrapped with `create-t3-app`.

## Project Docs

- [Schema foundation reference](docs/schema-reference.md) - canonical domain and workflow reference derived from `prisma/schema.prisma`
- [Mercado Pago sandbox enablement](docs/plans/mercadopago-checkout-pro-sandbox-enablement.md) - Checkout Pro configuration and validation plan

## Mercado Pago Checkout Pro

Checkout Pro uses server-only credentials. Prefer
`MERCADOPAGO_ACCESS_TOKEN` and `MERCADOPAGO_WEBHOOK_SECRET`; existing
environments may use the compatible aliases `MP_ACCESS_TOKEN` and
`MP_WEBHOOK_TOKEN`. Never prefix these variables with `NEXT_PUBLIC_`.

For the shared sandbox environment, configure Mercado Pago payment Webhooks at:

```text
https://coco-kappa-ashy.vercel.app/api/mercadopago/webhook
```

The provider configuration uses these return pages:

```text
https://coco-kappa-ashy.vercel.app/checkout/mercadopago/success
https://coco-kappa-ashy.vercel.app/checkout/mercadopago/failure
https://coco-kappa-ashy.vercel.app/checkout/mercadopago/pending
```

Keep the provider in `sandbox` mode until a complete test-buyer purchase and a
signed webhook simulation have both succeeded. Local `.env` values are not
automatically available to Vercel; configure the same server-only credentials
in the linked Vercel project.

## Product images (Vercel Blob)

The admin product form uploads card, cart and gallery images to a public
Vercel Blob store under `products/` and fills the field with the resulting
URL. Uploads need the server-only `BLOB_READ_WRITE_TOKEN`: create a Blob store
in the Vercel project (Storage → Blob) and connect it, which sets the variable
for the linked environments; copy it into `.env` for local uploads. Without it
the upload endpoint answers 503 and image URLs can still be pasted by hand.

Saving a product deletes the uploaded images it no longer uses: when an update
replaces or removes the card, cart or a gallery image, or the product is
deleted permanently, each dropped image is deleted from the store after the
database change commits. Only Vercel Blob URLs under `products/` are
deleted; other pasted URLs are never touched, and an image still used by
another product (deleted ones included) is kept. Soft-deleting a product keeps
its images so it can be restored. A Blob error or a missing token never fails
the save: it is logged (`productImageDeleteFailed`, `productImageDeleteSkipped`)
and the image stays in the store. Images uploaded from a form that was then
cancelled are not cleaned up.

## What's next? How do I make an app with this?

We try to keep this project as simple as possible, so you can start with just the scaffolding we set up for you, and add additional things later when they become necessary.

If you are not familiar with the different technologies used in this project, please refer to the respective docs. If you still are in the wind, please join our [Discord](https://t3.gg/discord) and ask for help.

- [Next.js](https://nextjs.org)
- [NextAuth.js](https://next-auth.js.org)
- [Prisma](https://prisma.io)
- [Drizzle](https://orm.drizzle.team)
- [Tailwind CSS](https://tailwindcss.com)
- [tRPC](https://trpc.io)

## Learn More

To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

You can check out the [create-t3-app GitHub repository](https://github.com/t3-oss/create-t3-app) — your feedback and contributions are welcome!

## How do I deploy this?

Follow our deployment guides for [Vercel](https://create.t3.gg/en/deployment/vercel), [Netlify](https://create.t3.gg/en/deployment/netlify) and [Docker](https://create.t3.gg/en/deployment/docker) for more information.

## Mercado Pago sandbox validation

The current validation target is `https://coco-kappa-ashy.vercel.app`. Its
configured database was correlated with a deliberately invalid webhook on
13 November 2026: the endpoint returned HTTP 401 and recorded a rejected,
unlinked event without creating a payment attempt. The three return pages
returned HTTP 200 with their expected titles and reconciliation notice.
These checks do not validate a test-buyer purchase. The exact deployed source
and isolated admin validation are recorded in the
[release evidence](docs/development-workflow/release/MP-VALIDATION-20261113/07-release-evidence.md). Results and operational identifiers belong to QA tickets
#22 and #25; the remaining sequence is in
[the validation plan](docs/plans/mercadopago-validation-resumption.md).

Preference recovery persists the attempt's expiry before preference creation. If a
response is lost, confirming again retrieves the known preference, or searches
by the attempt's external reference and fetches its detail. It resumes only one
unexpired preference whose reference, amount and currency match. An absent or
ambiguous search leaves the attempt pending and creates no replacement
preference. After expiry, reload checkout to confirm a new attempt on the same
order. A legacy attempt without a saved expiry and without a recoverable
preference needs administrative investigation; this change does not invent its
deadline. Recovery never approves a payment.

For notification failures, compare the provider's delivery and HTTP response,
the preference's notification URL, signature diagnostics, server logs and the
payment returned by `Payment.get`. A missing prerequisite blocks a case; an
implementation defect fails it. Record the actual provider status: `rejected`
maps to `failed`, `pending` to `pending`, and `in_process` to `inProcess`.

Run the focused verification with:

```bash
pnpm exec vitest run src/server/services/payments src/server/services/checkout src/app/api/mercadopago src/app/admin/payments/_components/payment.mappers.test.ts src/env.helpers.test.ts scripts/qa-tickets.data.test.ts
pnpm typecheck
```

Then run `pnpm test` and `pnpm build` before an authorized deployment. Mocked
replay verifies sequential behavior; concurrent deliveries still need an
isolated persistence test. A complete sandbox purchase, signed notification,
provider lookup, order submission and tracking remain required for acceptance.
