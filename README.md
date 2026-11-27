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

Set `MP_TEST_SELLER_USER_ID` to the sandbox seller ID in the QA deployment.
Checkout uses the provider’s `init_point` when the stored preference belongs to
that seller. Get the webhook signing secret from the application that issued the
preference, under Webhooks in the developer dashboard.

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

## Customer order emails

CoCo records a delivery in the order transaction. The dispatcher sends confirmed orders, rejected payments, pending bank transfers, pickup availability, delivery changes and rescheduled quantities through the configured email provider. A confirmed order includes its payment and public order number in one email.

Active admins and superadmins can open **Operación → Notificaciones** to see sent mail, filter by order or status, and inspect the original recipient, subject, text and HTML. **Enviado** means the email provider accepted the message. In test mode the recipient shown is the QA mailbox. The order chip opens all notices for that order and counts each notice once across retries. Tracking shows a chip for the specific event when it can be linked to its notice. Older events without evidence show **Sin registro de mail**.

The history and indicators use the current email partition. To pause dispatch and keep its history visible, keep the configured mode and partition and set `CUSTOMER_EMAIL_DISPATCH=false`. Setting the mode to `off` disables the history. Template updates take effect when a new request is prepared. An existing frozen request keeps its original design across retries.

1. Apply the additive `20261127000000_customer_email_delivery` migration to the target database using the project's migration process. Set `CUSTOMER_EMAIL_MODE=off` until the migration is in place. Only new events recorded while enabled generate deliveries.
2. For QA, set `CUSTOMER_EMAIL_MODE=test`, `CUSTOMER_EMAIL_ENVIRONMENT` to a unique deployment partition (e.g. `qa`), and `CUSTOMER_EMAIL_TEST_TO` to a controlled mailbox. For live sends use `CUSTOMER_EMAIL_MODE=live` on production with `APP_ENV=production` and its own partition. Each deployment reads only its own mode and partition. Use different partitions for previews that share a database.
3. For Gmail, set `CUSTOMER_EMAIL_PROVIDER=gmail`, `GMAIL_USER` to the sending account, and `GMAIL_APP_PASSWORD` to its [Google app password](https://myaccount.google.com/apppasswords) in Vercel Production as a sensitive variable. The account requires two-step verification. For Resend (default), set `RESEND_FROM` to an address on a verified domain and `RESEND_API_KEY` to a key with send permission. Configure `BETTER_AUTH_URL` as the public storefront origin and `CRON_SECRET` to a random server-only secret of at least 16 characters. Set `CUSTOMER_EMAIL_DISPATCH=true` when the worker should deliver pending messages.
4. New intents created by a checkout, Mercado Pago webhook or admin command wake the dispatcher after the HTTP response. The daily Vercel Cron in `vercel.json` calls `GET /api/internal/notifications/dispatch` at 09:00 UTC (06:00 in Argentina, subject to the Hobby scheduling window), even when nobody is using the store. Vercel sends `Authorization: Bearer <CRON_SECRET>`. Check logs for a successful scheduled call after deploying. Preview deployments can invoke the same endpoint with their own secret and partition. [Vercel Cron documentation](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

For QA, verify the code, buyer, amounts and login link against the order. Check the text and HTML, one shared shipment across two buyers, a partial pickup and a payment retry. With no access to an inbox, Resend's test recipients can simulate delivery outcomes. [Resend testing](https://resend.com/docs/dashboard/emails/send-test-emails)

Set `CUSTOMER_EMAIL_DISPATCH=false` to pause dispatch while still recording new events. Set mode to `off` to pause both. A dispatch already in progress may finish. Retain the table during an application rollback. Rows can be inspected without reading message content:

```sql
SELECT environment, status, count(*), min("createdAt") AS oldest
FROM customer_email_delivery
GROUP BY environment, status;
```

Monitor the oldest pending row, expired processing leases, review rows, and scheduled HTTP failures. For Gmail, search Sent using `rfc822msgid:` and the stored Message-ID. An SMTP timeout or expired sending lease requires review before another attempt. If acceptance was uncertain and the ID was never saved, reconstruct it as `<coco.HEX@DOMAIN>`, where HEX is the lowercase SHA-256 of the row ID (append `/REVISION` to the input for a nonzero frozen revision), and DOMAIN is the frozen sender domain. Temporary SMTP rejections and failures known to precede submission can be retried. For Resend, look up an accepted delivery's `providerId` in Resend for delivery or bounce evidence. A review row has a sanitized `lastError`. Resolve permanent configuration errors and compare timestamps and the key `coco/email/<row id>` with provider evidence. A revision for changed quantities or an expired window after exclusively confirmed 429 responses appends `/<revision>` to the key. After an ambiguous outcome past the idempotency window, establish whether the original was accepted before authorizing another send. [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
