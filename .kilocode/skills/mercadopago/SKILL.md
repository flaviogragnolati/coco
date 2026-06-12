---
name: mercadopago-nodejs-sdk
description: Implementar, auditar y mantener integraciones Mercado Pago con el SDK oficial Node.js/TypeScript, incluyendo Checkout Pro, Checkout API Orders, pagos, preferencias, webhooks, reembolsos, clientes, suscripciones, OAuth, Point y buenas prácticas de producción.
argument-hint: "Describe la tarea: integrar Checkout Pro, crear pagos, validar webhooks, migrar SDK, agregar reembolsos, implementar suscripciones, etc."
---

# Mercado Pago Node.js SDK Skill

## Objetivo

Usar este skill cuando Codex deba implementar, revisar, migrar o corregir una integración con el SDK oficial `mercadopago` para Node.js/TypeScript.

El objetivo es producir código seguro, idiomático, testeable y alineado con la documentación oficial vigente del SDK y de Mercado Pago Developers.

## Fuentes oficiales de referencia

Usar como fuente primaria:

- SDK oficial Node.js:
  - https://github.com/mercadopago/sdk-nodejs
- README del SDK:
  - https://github.com/mercadopago/sdk-nodejs/blob/master/README.md
- Código fuente del SDK:
  - https://github.com/mercadopago/sdk-nodejs/tree/master/src
- Documentación Checkout Pro:
  - https://www.mercadopago.com.ar/developers/en/docs/checkout-pro
- Documentación Checkout API / Orders:
  - https://www.mercadopago.com.ar/developers/en/docs/checkout-api-orders
- API Reference:
  - https://www.mercadopago.com.ar/developers/en/reference
- SDK Libraries:
  - https://www.mercadopago.com.ar/developers/en/docs/sdks-library

Cuando haya conflicto entre ejemplos viejos de internet y el SDK oficial actual, preferir siempre el repositorio oficial y la documentación de Mercado Pago Developers.

## Requisitos base

Antes de escribir código:

1. Verificar que el proyecto use Node.js compatible.
   - El SDK actual requiere Node.js 18 o superior.
2. Verificar la versión instalada del paquete:
   ```bash
   npm ls mercadopago
   ```
3. Si el paquete no existe:
   ```bash
   npm install mercadopago
   ```
4. No usar sintaxis vieja del SDK v1, por ejemplo:
   - `mercadopago.configure(...)`
   - `mercadopago.preferences.create(...)`
   - `mercadopago.payment.create(...)`
5. Usar la API moderna basada en clases:
   ```ts
   import { MercadoPagoConfig, Preference, Payment, Order } from "mercadopago";
   ```

## Regla crítica de seguridad

Nunca exponer `MERCADOPAGO_ACCESS_TOKEN` en frontend, logs, commits, respuestas HTTP o bundles públicos.

El `accessToken` es una credencial privada de backend. El frontend solo puede usar `Public Key` cuando corresponda, especialmente para MercadoPago.js, Checkout Bricks o Wallet Brick.

Codex debe revisar que:

- `.env` esté en `.gitignore`.
- No haya tokens hardcodeados.
- No se retornen errores crudos de Mercado Pago al cliente final si contienen metadata sensible.
- No se imprima el `accessToken`.
- Las rutas de backend validen permisos del usuario antes de crear pagos, preferencias o reembolsos.

## Inicialización estándar del SDK

Crear un módulo único para inicializar el cliente cuando la integración use una sola cuenta Mercado Pago.

Ejemplo recomendado:

```ts
// src/lib/mercadopago/client.ts
import "server-only";
import { MercadoPagoConfig } from "mercadopago";

const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

if (!accessToken) {
  throw new Error("Missing MERCADOPAGO_ACCESS_TOKEN");
}

export const mercadoPagoClient = new MercadoPagoConfig({
  accessToken,
  options: {
    timeout: Number(process.env.MERCADOPAGO_TIMEOUT_MS ?? 5000),
  },
});
```

Para integraciones multi-seller, OAuth o marketplace, no usar singleton global con un único token. Usar factory por seller/account:

```ts
// src/lib/mercadopago/factory.ts
import "server-only";
import { MercadoPagoConfig } from "mercadopago";

export function createMercadoPagoClient(accessToken: string) {
  if (!accessToken) {
    throw new Error("Missing seller Mercado Pago access token");
  }

  return new MercadoPagoConfig({
    accessToken,
    options: {
      timeout: 5000,
    },
  });
}
```

## Request options e idempotencia

Para operaciones mutantes, usar `requestOptions.idempotencyKey` siempre que haya riesgo de retry, doble click, timeout, worker retry o repetición por red.

Aplica especialmente a:

- `Payment.create`
- `Order.create`
- `Order.process`
- `Order.capture`
- `Order.refund`
- `PaymentRefund.create`
- `PaymentRefund.total`
- `Preference.create`, si el backend puede repetir el intento
- cualquier operación que cree, capture, procese o reembolse dinero

Ejemplo:

```ts
import { randomUUID } from "node:crypto";
import { Order } from "mercadopago";
import { mercadoPagoClient } from "@/lib/mercadopago/client";

const orderClient = new Order(mercadoPagoClient);

const result = await orderClient.create({
  body,
  requestOptions: {
    idempotencyKey: randomUUID(),
  },
});
```

Cuando exista una orden interna, preferir una clave determinística estable:

```ts
const idempotencyKey = `order:${internalOrderId}:create`;
```

No reutilizar la misma idempotency key para operaciones semánticamente distintas.

## Superficie pública del SDK

El SDK exporta estos clientes principales desde `mercadopago`.

### Configuración

```ts
import { MercadoPagoConfig } from "mercadopago";
```

### Clientes disponibles

```ts
import {
  AdvancedPayment,
  CardToken,
  Chargeback,
  Customer,
  CustomerCard,
  DisbursementRefund,
  IdentificationType,
  Invoice,
  MerchantOrder,
  OAuth,
  Order,
  Payment,
  PaymentMethod,
  PaymentRefund,
  Point,
  PreApproval,
  PreApprovalPlan,
  Preference,
  User,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
  SignatureFailureReason,
} from "mercadopago";
```

## Mapa de clientes y métodos

Usar este mapa como guía inicial. Si se necesita un campo exacto de request/response, inspeccionar los tipos del SDK en `node_modules/mercadopago/dist` o el código fuente oficial.

| Cliente | Uso | Métodos |
|---|---|---|
| `Preference` | Checkout Pro / preferencias de pago | `create`, `get`, `update`, `search` |
| `Order` | Checkout API Orders v2 | `create`, `get`, `process`, `capture`, `cancel`, `refund`, `createTransaction`, `updateTransaction`, `deleteTransaction` |
| `Payment` | Pagos directos Checkout API Payments v1 | `create`, `get`, `search`, `capture`, `cancel` |
| `PaymentRefund` | Reembolsos sobre pagos | `create`, `total`, `get`, `list` |
| `MerchantOrder` | Órdenes comerciales agrupadas | `create`, `get`, `update`, `search` |
| `Customer` | Clientes/compradores guardados | `create`, `get`, `remove`, `update`, `search`, `createCard`, `getCard`, `removeCard`, `listCards` |
| `CustomerCard` | Tarjetas asociadas a clientes | `create`, `get`, `remove`, `update`, `list` |
| `CardToken` | Tokenización de tarjetas | `create` |
| `PaymentMethod` | Medios de pago disponibles | `get` |
| `IdentificationType` | Tipos de documento válidos por país | `list` |
| `PreApproval` | Suscripciones / pagos recurrentes | `create`, `get`, `search`, `update` |
| `PreApprovalPlan` | Planes de suscripción | `create`, `get`, `update`, `search` |
| `Invoice` | Facturas de suscripciones | `get`, `search` |
| `OAuth` | Autorización OAuth marketplace/multi-seller | `create`, `refresh`, `getAuthorizationURL` |
| `AdvancedPayment` | Marketplace / split payments | `create`, `get`, `search`, `update`, `cancel`, `capture`, `updateReleaseDate` |
| `DisbursementRefund` | Reembolsos de disbursements | `listAll`, `createAll`, `create` |
| `Chargeback` | Contracargos | `get`, `search` |
| `Point` | Mercado Pago Point / Smart POS | `createPaymentIntent`, `searchPaymentIntent`, `cancelPaymentIntent`, `getPaymentIntentList`, `getPaymentIntentStatus`, `getDevices`, `changeDeviceOperatingMode` |
| `User` | Usuario/cuenta autenticada | `get` |
| `WebhookSignatureValidator` | Validación local de webhooks | `validate` |

## Elección de producto Mercado Pago

Antes de implementar, identificar el flujo correcto.

### Checkout Pro

Usar `Preference` cuando:

- Se quiere redirigir al usuario al checkout hospedado de Mercado Pago.
- Se quiere crear una preferencia con items, payer, back URLs, expiration, payment methods, `external_reference`, etc.
- El frontend usará MercadoPago.js, Wallet Brick o redirección mediante `init_point`.

### Checkout API Orders

Usar `Order` cuando:

- Se necesita control más directo del checkout.
- Se usa la nueva API de Orders.
- Se modela una orden con transacciones y procesamiento explícito.
- Se necesita crear, procesar, capturar, cancelar o reembolsar una orden.

### Payments API

Usar `Payment` cuando:

- Se va a crear un pago directo.
- Ya se tiene token de tarjeta o método de pago.
- La experiencia de checkout está controlada por la aplicación.

### Suscripciones

Usar:

- `PreApprovalPlan` para crear y administrar planes.
- `PreApproval` para crear y administrar acuerdos de suscripción.
- `Invoice` para consultar facturas generadas por suscripciones.

### Marketplace / multi-seller

Usar:

- `OAuth` para conectar cuentas de vendedores.
- `AdvancedPayment` para split payments.
- `DisbursementRefund` para reembolsos de disbursements.

### Point

Usar `Point` cuando la operación involucra terminales Mercado Pago Point / Smart POS.

## Implementación Checkout Pro con `Preference`

### Servicio backend recomendado

```ts
// src/server/payments/createPreference.ts
import { Preference } from "mercadopago";
import { mercadoPagoClient } from "@/lib/mercadopago/client";

type CreatePreferenceInput = {
  internalOrderId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  payerEmail?: string;
};

export async function createCheckoutPreference(input: CreatePreferenceInput) {
  const preference = new Preference(mercadoPagoClient);

  const result = await preference.create({
    body: {
      items: [
        {
          title: input.title,
          quantity: input.quantity,
          unit_price: input.unitPrice,
          currency_id: "ARS",
        },
      ],
      payer: input.payerEmail
        ? {
            email: input.payerEmail,
          }
        : undefined,
      external_reference: input.internalOrderId,
      back_urls: {
        success: `${process.env.APP_URL}/payments/success`,
        failure: `${process.env.APP_URL}/payments/failure`,
        pending: `${process.env.APP_URL}/payments/pending`,
      },
      auto_return: "approved",
      notification_url: process.env.MERCADOPAGO_WEBHOOK_URL,
    },
    requestOptions: {
      idempotencyKey: `preference:${input.internalOrderId}`,
    },
  });

  return {
    id: result.id,
    initPoint: result.init_point,
    sandboxInitPoint: result.sandbox_init_point,
  };
}
```

### Reglas para preferencias

Codex debe verificar:

- Crear una preferencia por orden o intento de pago.
- Usar `external_reference` para mapear la preferencia/pago contra la orden interna.
- No confiar en el frontend para precios, cantidades o moneda.
- Recalcular totales en backend.
- No aceptar `unit_price` enviado por el cliente sin validarlo contra la base de datos.
- Usar `notification_url` solo si se necesita URL dinámica; si no, preferir configuración centralizada desde “Your integrations”.
- Recordar que la URL configurada en la preferencia puede tener precedencia sobre la configuración del panel.
- Guardar en base de datos:
  - `internalOrderId`
  - `preferenceId`
  - `externalReference`
  - estado interno inicial
  - monto esperado
  - moneda
  - usuario
  - timestamps

## Implementación Checkout API Orders con `Order`

Usar `Order` cuando la integración esté basada en Orders.

Ejemplo base:

```ts
// src/server/payments/createOrder.ts
import { randomUUID } from "node:crypto";
import { Order } from "mercadopago";
import { mercadoPagoClient } from "@/lib/mercadopago/client";

export async function createMercadoPagoOrder(input: {
  internalOrderId: string;
  amount: string;
  payerEmail: string;
  cardToken: string;
}) {
  const order = new Order(mercadoPagoClient);

  return await order.create({
    body: {
      type: "online",
      processing_mode: "automatic",
      total_amount: input.amount,
      external_reference: input.internalOrderId,
      payer: {
        email: input.payerEmail,
      },
      transactions: {
        payments: [
          {
            amount: input.amount,
            payment_method: {
              id: "master",
              type: "credit_card",
              token: input.cardToken,
              installments: 1,
              statement_descriptor: "Store name",
            },
          },
        ],
      },
    },
    requestOptions: {
      idempotencyKey: `order:${input.internalOrderId}:${randomUUID()}`,
    },
  });
}
```

### Reglas para Orders

Codex debe:

- Inspeccionar el tipo exacto esperado por el SDK instalado.
- No inventar campos si TypeScript no los acepta.
- Usar strings para montos cuando el ejemplo oficial de `Order` lo haga.
- Usar idempotencia.
- Persistir `order.id` y `external_reference`.
- Implementar reconciliación mediante webhook + consulta posterior a Mercado Pago.

## Implementación Payments API con `Payment`

Ejemplo base:

```ts
import { Payment } from "mercadopago";
import { mercadoPagoClient } from "@/lib/mercadopago/client";

export async function createPayment(input: {
  internalOrderId: string;
  transactionAmount: number;
  token?: string;
  paymentMethodId: string;
  payerEmail: string;
}) {
  const payment = new Payment(mercadoPagoClient);

  return await payment.create({
    body: {
      transaction_amount: input.transactionAmount,
      token: input.token,
      description: `Order ${input.internalOrderId}`,
      payment_method_id: input.paymentMethodId,
      payer: {
        email: input.payerEmail,
      },
      external_reference: input.internalOrderId,
    },
    requestOptions: {
      idempotencyKey: `payment:${input.internalOrderId}`,
    },
  });
}
```

### Reglas para pagos

Codex debe:

- Validar monto y moneda en backend.
- Asociar cada pago a una orden interna.
- Persistir `payment.id`, `status`, `status_detail`, `external_reference`.
- No marcar una orden como pagada solo porque `Payment.create` respondió; verificar estado.
- Tratar estados `pending`, `approved`, `rejected`, `cancelled`, `refunded`, `charged_back` según la lógica del negocio.
- Consultar `Payment.get({ id })` al recibir webhooks.

## Webhooks

### Principio general

Los webhooks son señales de evento, no la fuente final de verdad.

Al recibir un webhook:

1. Validar la firma si corresponde.
2. Responder rápido con `200`.
3. Registrar el evento recibido.
4. Deduplicar por evento, `x-request-id`, `data.id`, `type` y/o identificador interno.
5. Consultar a Mercado Pago por el recurso definitivo.
6. Actualizar la orden interna en una transacción de base de datos.
7. No depender solo del body del webhook para marcar pagos como aprobados.

### Configuración

Preferir configuración desde “Your integrations” cuando la URL es estable.

Usar `notification_url` en la preferencia cuando:

- La URL necesita parámetros dinámicos.
- La integración es multi-seller.
- Se necesita distinguir cuentas, tenants o sellers por URL.

### Headers y query params importantes

Mercado Pago puede enviar:

- Query params:
  - `data.id`
  - `type`
- Headers:
  - `x-signature`
  - `x-request-id`
  - `x-retry`
- Body:
  - `action`
  - `api_version`
  - `data.id`
  - `date_created`
  - `id`
  - `live_mode`
  - `type`
  - `user_id`

### Validación con `WebhookSignatureValidator`

Usar el validador incluido en el SDK:

```ts
import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";

export function validateMercadoPagoWebhook(input: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error("Missing MERCADOPAGO_WEBHOOK_SECRET");
  }

  WebhookSignatureValidator.validate({
    xSignature: input.xSignature,
    xRequestId: input.xRequestId,
    dataId: input.dataId,
    secret,
    toleranceSeconds: 300,
  });
}
```

### Next.js App Router webhook

```ts
// src/app/api/mercadopago/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  InvalidWebhookSignatureError,
  Payment,
  WebhookSignatureValidator,
} from "mercadopago";
import { mercadoPagoClient } from "@/lib/mercadopago/client";

export async function POST(req: NextRequest) {
  const url = new URL(req.url);

  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const dataId = url.searchParams.get("data.id");
  const type = url.searchParams.get("type");

  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      console.error("Invalid Mercado Pago webhook signature", {
        reason: error.reason,
        requestId: error.requestId,
        timestamp: error.timestamp,
      });

      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }

    throw error;
  }

  const body = await req.json().catch(() => null);

  console.info("Mercado Pago webhook received", {
    xRequestId,
    type,
    dataId,
    action: body?.action,
    liveMode: body?.live_mode,
  });

  if (type === "payment" && dataId) {
    const paymentClient = new Payment(mercadoPagoClient);
    const payment = await paymentClient.get({ id: dataId });

    // TODO: en una transacción:
    // 1. deduplicar evento
    // 2. localizar orden por payment.external_reference
    // 3. validar monto esperado
    // 4. actualizar estado interno
    // 5. registrar payment.status y payment.status_detail
  }

  return NextResponse.json({ received: true });
}
```

### Express webhook

```ts
import express from "express";
import {
  InvalidWebhookSignatureError,
  Payment,
  WebhookSignatureValidator,
} from "mercadopago";
import { mercadoPagoClient } from "./mercadopago/client";

const router = express.Router();

router.post("/webhooks/mercadopago", express.json(), async (req, res) => {
  const xSignature = req.header("x-signature");
  const xRequestId = req.header("x-request-id");
  const dataId = req.query["data.id"];
  const type = req.query.type;

  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId: Array.isArray(dataId) ? dataId[0] : dataId,
      secret: process.env.MERCADOPAGO_WEBHOOK_SECRET!,
      toleranceSeconds: 300,
    });
  } catch (error) {
    if (error instanceof InvalidWebhookSignatureError) {
      return res.status(401).json({ error: "invalid signature" });
    }

    throw error;
  }

  if (type === "payment" && dataId) {
    const payment = new Payment(mercadoPagoClient);
    const paymentData = await payment.get({
      id: Array.isArra