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
https://coco-murex.vercel.app/api/mercadopago/webhook
```

The provider configuration uses these return pages:

```text
https://coco-murex.vercel.app/checkout/mercadopago/success
https://coco-murex.vercel.app/checkout/mercadopago/failure
https://coco-murex.vercel.app/checkout/mercadopago/pending
```

Keep the provider in `sandbox` mode until a complete test-buyer purchase and a
signed webhook simulation have both succeeded. Local `.env` values are not
automatically available to Vercel; configure the same server-only credentials
in the linked Vercel project.

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
