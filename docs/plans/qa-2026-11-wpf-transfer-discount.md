# Plan: WP-F, descuento por transferencia (#110)

> **Estado:** Working. Feature grill del 13/11/2026. Flavio contestó las 6 preguntas por el orquestador y eligió la opción recomendada en todas. También aceptó los 5 supuestos del grill.
> **Origen:**
> - `docs/plans/qa-open-tickets-2026-11-orchestration.md` (§2, §3, §6 WP-F, §7, §8 y §9);
> - la fila #110 de `docs/plans/qa-open-tickets-2026-11-report.md`;
> - el ticket #110 ("Mostrar el 10 % de descuento por pago con transferencia").
>
> **Decisión de arquitectura:** `docs/adr/0013-transfer-discount-is-an-attribute-of-the-payment-attempt.md`. Es una excepción acotada al ADR 0008.
> **Base:** `main` con **WP-A, WP-C y WP-G ya mergeados**:
> - WP-C (`qa-2026-11-wpc-product-card.md`): el botón no lleva monto y el precio por kg o litro se muestra siempre en `PurchasePrice`.
> - WP-G (`qa-2026-11-wpg-repeat-order.md`): en `order-detail-view.tsx` toca el encabezado (`actionsSlot`) y las líneas ("cantidad × precio").
>
> Si alguno no está en `main` al arrancar, frenar y avisar al orquestador.
> **Bloqueante antes de mergear:** Flavio aprueba el texto `checkout-v4` (§13).

## 1. Objetivo

El cliente que paga por transferencia paga un % menos sobre los productos, y lo sabe antes de pagar:
- en la ficha del producto;
- en "Tu pedido";
- en el paso de pago, que ya muestra el monto final.

Lo que se le pide transferir es exactamente lo que vio. El admin concilia contra ese monto y ve de dónde sale. "Mis pedidos" muestra el desglose. Mercado Pago no cambia.

## 2. Decisiones (registro del grill)

| Tema | Decisión | Fuente |
| --- | --- | --- |
| Dónde se configura | Campo "Descuento por transferencia (%)" en `/admin/payments` → "Pago externo" (`ExternalConfigEditor`). Se guarda en los settings JSON del proveedor `external` y solo lo edita un superadmin. | §2 de la orquestación |
| Base | El subtotal de **productos**: la suma de los totales de línea. No incluye envío (hoy no se cobra envío). | §6 de la orquestación + ticket |
| Dónde se ve | En la ficha desplegada ("$ 123.660 pagando con transferencia"), **no** en la tarjeta del catálogo. En el pedido, el total y debajo "Con transferencia: $ X". En el paso de pago, el total final ya trae el descuento. | §6 de la orquestación + ticket |
| P1: acumulación | **Se suma** al descuento de oferta. El % se aplica sobre el precio que ya tiene la oferta. | Flavio, 13/11 (opción A) |
| P2: dónde queda registrado | El detalle de "Mis pedidos" muestra el desglose (subtotal, descuento y total). El %, el subtotal y el descuento se guardan **en el intento de pago** (`UserTransaction`), no en el pedido, porque un mismo pedido puede pasar por intentos de distinto medio. | Flavio, 13/11 (opción A) |
| P3: cambio de medio con un intento abierto | El intento se reusa **solo si es del mismo medio**. Si el medio cambió, se cancela y se crea uno nuevo, salvo un MP "en proceso" o una transferencia con comprobante informado, que se mantienen. Es la misma regla que "Volver a editar el pedido" (`isCancellablePaymentAttempt`). | Flavio, 13/11 (opción A) |
| P4: redondeo | Se redondea **el total con transferencia hacia abajo** al peso entero, y el descuento = subtotal − total. | Flavio, 13/11 (opción A) |
| P5: cambio del % durante el checkout | El % se fija al confirmar. La pantalla manda el monto que mostró; si no coincide con el que calcula el servidor, se frena sin crear nada y se le muestra al cliente el monto nuevo. Un intento que ya existe y se reusa conserva su propio monto. | Flavio, 13/11 (opción A) |
| P6: conciliación | "Monto" en `/admin/payments` sigue siendo lo que entra al banco, con la marca "−10 % transf.". El detalle del intento muestra "A cobrar en el banco" y el desglose. | Flavio, 13/11 (opción A) |
| Exposición pública del % | Procedure pública `catalog.transferDiscount` → `{ percent: number \| null }`. Devuelve `null` si el pago externo está deshabilitado o el % es 0. El resto de los settings sigue siendo solo para admins. | Orquestador, 13/11 |
| Términos | `checkout-v4`, con el texto de §13, **pendiente de aprobación de Flavio**. Incluye "a tu favor". | Flavio, 13/11 + orquestador |

**Opciones descartadas:**
- P1: que el descuento no aplique a productos en oferta, o que se aplique solo el mayor de los dos.
- P2: columnas en el pedido (el default del brief), o no mostrar desglose.
- P3: reusar siempre el intento (el comportamiento actual), o frenar con un mensaje.
- P4: redondear al peso más cercano.
- P5: fijar el % sin avisar, o fijarlo al entrar al checkout.
- P6: mostrar solo el monto, sin desglose.

**Supuestos aceptados por Flavio (13/11):**

| # | Supuesto |
| --- | --- |
| S1 | Si el pago externo está deshabilitado o el % es 0 o está vacío, no se muestra nada en ningún lado. |
| S2 | El campo acepta de 0 a 50, con hasta 2 decimales (7,5 %). |
| S3 | "Con transferencia: $ X" aparece debajo del total en `/cart`, en el mini-pedido y en el resumen del checkout. Cuando el cliente elige "Pago externo", el resumen pasa a mostrar el desglose y el total ya con descuento. El mosaico de "Pago externo" muestra el monto final. |
| S4 | En el tutorial, los datos de ejemplo llevan un 10 % fijo: "Con transferencia: $ 31.410" en el pedido y en el mosaico. Como el tutorial paga con Mercado Pago, el total sigue en $ 34.900. Los textos del tutorial no nombran el %. |
| S5 | La ficha redondea el precio de un paso y el pedido redondea el total, así que pueden diferir en $ 1 con varias unidades. Manda el pedido. |

**Decisiones del grill que no se preguntaron** (desvíos menores; el orquestador las revisa):

| # | Decisión | Por qué |
| --- | --- | --- |
| G1 | El descuento aplica solo a totales en **ARS**. En otra moneda no se muestra ni se aplica. | "Peso entero" solo tiene sentido en pesos, y la transferencia es a un CBU argentino. Hoy todo el catálogo está en ARS. |
| G2 | La comparación del monto mostrado (P5) vale **para los dos medios**, no solo para la transferencia. | Cubre también un precio que el admin editó mientras el cliente estaba en el checkout. No toca la preferencia de MP: solo frena antes de crear el intento. |
| G3 | Cuando un pago se completa (`submitOrderForCompletedPayment`), se cancelan los **otros** intentos pendientes del pedido que no tienen comprobante informado. | P3 deja una preferencia de MP vieja que todavía se puede pagar. Si MP la aprueba tarde, sin esto el pedido pago seguiría mostrando datos de transferencia (§10, R1). |
| G4 | En "Mis pedidos", la última fila del desglose dice "Total pagado" si el intento está completado y "Total a transferir" si está pendiente. | Un pedido pendiente no está "pagado". |

## 3. Alcance

**Entra:**
- El setting y el campo en el admin.
- La procedure pública.
- La lógica pura del descuento.
- Las columnas nuevas en `UserTransaction` (migración aditiva).
- `confirmAndPay`: monto por medio, reuso por medio y monto esperado.
- La cancelación de los intentos sobrantes al completar un pago.
- Lo que ve el cliente: ficha, `/cart`, mini-pedido, checkout (resumen, pasos, barra mobile y resultado) y detalle de "Mis pedidos".
- El admin de pagos: lista y detalle.
- `checkout-v4`.
- Tutorial, glosario del admin, `docs/schema-reference.md` y los tests.

**No entra (non-goals):**
- La tarjeta del catálogo, la home y el destacado (§6 de la orquestación).
- Descuento sobre el envío. Hoy no hay envío cobrado, y #105 está fuera.
- Descuentos por otros medios, por producto o por categoría (habría que reemplazar el ADR 0013).
- El cálculo de reintegros: no existe en el código. La regla queda en los términos y en el ADR.
- Cambiar el texto del mosaico "Pago externo" o el nombre del medio.
- Notificaciones.
- Reportes de ventas con descuento.

**Diferido:** nada propio. Si llega #105 (envío cobrado), el envío entra como línea aparte y queda fuera de la base del descuento: esta regla ya lo prevé.

**No hay que romper** (§3 de la orquestación; cada punto tiene un test explícito en §8):
- **Idempotencia de `confirmAndPay`:** la misma `idempotencyKey` devuelve el mismo intento, aunque el % o el monto mostrado cambien después.
- **Un pedido vivo por carrito:** cambiar de medio crea un intento nuevo sobre **el mismo** pedido, y nunca un segundo pedido.
- **Invariante de la preferencia de MP** (`mercadopago-preference.decision.ts:59-77`): un intento de MP nunca lleva descuento, su monto es la suma de las líneas y la preferencia se arma sin error aunque el % esté configurado.

Además:
- `UserTransaction.amount` sigue siendo "lo que cobra el intento", así que operaciones, trazabilidad y la conciliación de MP no cambian.
- El tutorial no hace llamadas tRPC (ADR 0012).
- El drift test del glosario.

## 4. Contexto actual (verificado en `055450f`)

- **Total del pedido:** `cart.totals[0]` → `UserTransaction.amount` (`checkout.service.ts:715-805`). Los totales de línea salen de `calculateLineTotal` (`commerce.helpers.ts:477-494`) y ya llevan el descuento de oferta.
- **Reuso de intentos:** si el carrito tiene un pedido vivo con un intento no vencido, se devuelve ese intento sin mirar el medio elegido (`checkout.service.ts:746-773`). El pedido se reusa entre intentos y sus líneas quedan con los precios de la primera confirmación.
- **Reglas de los intentos:** `isSpentPaymentAttempt` e `isCancellablePaymentAttempt` (`payment-attempt.decision.ts`). "Volver a editar el pedido" usa la segunda (`checkout-release.decision.ts`).
- **Settings del pago externo:** `externalPaymentSettingsSchema` (`src/schemas/admin/payment.schemas.ts:231-244`), combinados con los defaults en `parseExternalPaymentSettings` (`external-payment-config.service.ts`). Un campo nuevo con default no necesita migración de datos. `externalPaymentInstructionsSchema` extiende los settings, así que el % también llega a las instrucciones (es inocuo).
- **Permisos:** `getExternalConfig` es `adminProcedure` y `updateExternalConfig` es `superadminProcedure` (`payment.router.ts:107-118`).
- **"Total estimado"** aparece en 4 lugares:
  - `cart-summary.tsx:92`;
  - `cart-sheet-view.tsx:144`;
  - `checkout-summary.tsx:138`;
  - `checkout-order-step.tsx:107`.

  Además están el "Total" de `checkout-review-step.tsx:124` y la barra mobile (`checkout-summary.tsx`, `CheckoutMobileBar`).
- **Pantalla de pago:** `checkout-payment-step.tsx:28-38`, con texto fijo y sin monto. El checkout arma el total desde el store del carrito (`checkout-client.tsx:94-100`, `liveCart`).
- **Detalle de "Mis pedidos":** el "Resumen" muestra "Monto" = `transactions[0].amount` (`order-detail-view.tsx:196-204`, `checkout.service.ts:260`).
- **Admin de pagos:**
  - columna "Monto" (`payments-admin-client.tsx:966-968`);
  - el detalle del intento (`:183-360`) no muestra el monto;
  - `ExternalConfigEditor` en `:688-830`;
  - selects en `payment.data.ts:32-80` y schemas en `payment.schemas.ts:52` y `:106`.
- **Tutorial:** las escenas renderizan las vistas reales con props (`cart-scene.tsx`, `catalog-scene.tsx` con `CartSheetView`, `checkout-scene.tsx`). El total es $ 34.900, pagado con MP (`tutorial-fixtures.ts`, `tutorial-fixtures.test.ts:89-96`). El script versión "rápido" tiene `cartSummary` (paso 5) y `checkoutPayment` (paso 8).
- **Completar un pago:** `submitOrderForCompletedPayment` (`order-submission.service.ts`) es la transición que comparten el webhook de MP y la liquidación del admin. No toca los demás intentos del pedido.
- **Envío:** no existe una línea de envío en el pedido ni en el carrito.

## 5. Enfoque

1. **Una sola función pura** calcula el descuento a partir de (subtotal, %, moneda) con aritmética entera: centavos y puntos básicos. La usan el servidor al crear el intento, el checkout, el pedido, la ficha y el tutorial. Lo que se muestra y lo que se cobra no pueden divergir.
2. **El intento es el dueño del descuento** (ADR 0013). `amount` = lo que se cobra, y tres columnas nulas guardan el %, el subtotal y el descuento. Las líneas, el carrito y `calculateLineTotal` no cambian.
3. **El % llega a las vistas como prop**, nunca con un hook dentro de la vista: los contenedores reales lo leen (estado del checkout o `catalog.transferDiscount`) y el tutorial pasa su 10 % fijo.
4. **`confirmAndPay`** calcula el monto del medio elegido, decide reusar o reemplazar el intento abierto con una función pura, compara con el monto mostrado y recién después crea el intento.

## 6. Mapa de archivos

| Archivo | Cambio |
| --- | --- |
| `src/shared/common/transfer-discount.ts` (+ `.test.ts`) | **Nuevo.** Lógica pura del descuento. |
| `src/schemas/admin/payment.schemas.ts` | Campo `transferDiscountPercent` en los settings; columnas nuevas en la lista y el detalle de intentos. |
| `src/server/services/payments/external/external-payment-config.service.ts` | Default `0`; `getPublicTransferDiscountPercent`. |
| `src/schemas/catalog.schemas.ts`, `src/server/api/routers/catalog.router.ts` | `transferDiscountSchema`; procedure pública `catalog.transferDiscount`. |
| `prisma/schema.prisma` + `prisma/migrations/<ts>_transfer_discount_on_payment_attempt/migration.sql` | 3 columnas nulas en `UserTransaction` y un CHECK. |
| `src/server/services/checkout/payment-charge.decision.ts` (+ `.test.ts`) | **Nuevo.** Reusar o reemplazar el intento abierto. |
| `src/server/services/checkout/checkout.data.ts` | Selects y `createPendingTransaction` con las columnas nuevas. |
| `src/schemas/checkout.schemas.ts` | `expectedAmount` en el input; `transferDiscountPercent` en el estado; columnas en el detalle y el resultado. |
| `src/server/services/checkout/checkout.service.ts` | `start`/`getState` con el %; `confirmAndPay`; `buildPaymentResult`/`toOrderDetail` con el desglose. |
| `src/server/services/checkout/checkout.payment-switch.test.ts` | **Nuevo.** Tests de servicio de los tres invariantes de §3 y de P3/P5. |
| `src/server/services/checkout/checkout.data.ts` + `order-submission.service.ts` (+ test) | Cancelar los demás intentos pendientes al completar un pago (G3). |
| `src/features/cart/_components/transfer-total.tsx` | **Nuevo.** "Con transferencia: $ X" y el desglose. |
| `src/features/catalog/_components/purchase-panel.tsx`, `src/app/(storefront)/products/_components/catalog-product-purchase.tsx`, `product-details-dialog.tsx` | Línea "pagando con transferencia" solo en la ficha. |
| `src/app/(storefront)/cart/_components/{cart-client,cart-page-view,cart-summary}.tsx`, `src/features/cart/_components/{cart-sheet,cart-sheet-view}.tsx` | Prop `transferDiscountPercent` y la línea. |
| `src/app/(storefront)/checkout/_components/{checkout-client,checkout-summary,checkout-payment-step,checkout-review-step,checkout-order-step,checkout-result-panel}.tsx` | Monto por medio, desglose, `expectedAmount` y el manejo del rechazo por monto. |
| `src/app/(storefront)/my-orders/[orderId]/_components/order-detail-view.tsx` | Desglose en el "Resumen". |
| `src/app/admin/payments/_components/payments-admin-client.tsx` | Campo del %, marca en "Monto", "A cobrar en el banco" y el desglose. |
| `src/shared/common/checkout-terms.ts` (+ test) | `checkout-v4`. |
| `src/features/tutorial/{tutorial-fixtures,tutorial-script}.ts` (+ tests), `_components/scenes/{cart,catalog,checkout}-scene.tsx`, `e2e/customer-tutorial.spec.ts` | 10 % de ejemplo y textos. |
| `src/features/admin/glossary/data/payments.ts` | Concepto "Descuento por transferencia". |
| `docs/schema-reference.md` | Columnas nuevas. |

## 7. Pasos (en orden)

### 7.1. Lógica pura (tests primero)

1. **`src/shared/common/transfer-discount.ts`** (nuevo, sin `server-only`):
   - `TRANSFER_DISCOUNT_MAX_PERCENT = 50`.
   - `normalizeTransferDiscountPercent(value: unknown): number | null`: devuelve el número si es finito y está en el rango 0 < p ≤ 50; en cualquier otro caso, `null`.
   - `type TransferDiscountBreakdown = { percent: number; subtotal: string; discount: string; total: string }`. Los montos son strings de `toMoneyString`.
   - `applyTransferDiscount(input: { subtotal: string | number; percent: number | null; currency: CatalogCurrency }): TransferDiscountBreakdown | null`:
     - devuelve `null` si `normalizeTransferDiscountPercent(percent) === null`, si `currency !== "ARS"` (G1) o si el subtotal es ≤ 0 o no es finito;
     - `subtotalCents = Math.round(Number(subtotal) * 100)` y `bps = Math.round(percent * 100)`;
     - `scaled = subtotalCents * (10_000 - bps)`; `totalPesos = (scaled - (scaled % 1_000_000)) / 1_000_000`. Es entero y redondea hacia abajo (P4);
     - `total = toMoneyString(totalPesos)` y `discount = toMoneyString((subtotalCents - totalPesos * 100) / 100)`;
     - `subtotal = toMoneyString(subtotalCents / 100)`.
     - JSDoc: es exacto mientras el subtotal no pase de ~$ 9.000 millones (`Number.MAX_SAFE_INTEGER / 10_000` centavos); cita el ADR 0013.
   - `getTransferStepPrice(stepPrice: number | null, percent: number | null, currency: CatalogCurrency): string | null`: `applyTransferDiscount({ subtotal: stepPrice, percent, currency })?.total ?? null`. Lo usa la ficha.
   - `decideAttemptCharge({ provider: string; subtotal: string; currency: CatalogCurrency; transferDiscountPercent: number | null }): { amount: string; transferDiscount: TransferDiscountBreakdown | null }`. Vive acá y no en el servidor, porque el checkout del cliente la usa para mostrar y mandar el monto (paso 21):
     - con un `provider` distinto de `"external"`, siempre `{ amount: toMoneyString(Number(subtotal)), transferDiscount: null }`;
     - con `"external"`, `applyTransferDiscount(...)`: si da `null`, el subtotal; si no, `breakdown.total`.
   - `moneyEquals(left: string, right: string): boolean`, comparando en centavos enteros (`Math.round(Number(x) * 100)`), como `toCents` de la conciliación de MP.
2. **`transfer-discount.test.ts`:**
   - 137.400 al 10 % → total `123660.00`, descuento `13740.00`;
   - 45.215 al 10 % → `40693.00` / `4522.00` (hacia abajo);
   - 34.900 al 10 % → `31410.00`;
   - 137.400 al 7,5 % → `127095.00`;
   - 11.302,50 al 10 % → `10172.00` / `1130.50`;
   - `null`, `0`, `-1`, `50.01` y `NaN` como % → `null`;
   - `USD` → `null`;
   - subtotal `0` → `null`;
   - `getTransferStepPrice(137400, 10, "ARS")` → `"123660.00"`;
   - `decideAttemptCharge`: MP con el % en 10 → `"137400.00"` sin descuento; externo con 10 → `"123660.00"` con el desglose; externo sin % → el subtotal;
   - `moneyEquals("123660", "123660.00")` → `true`; `moneyEquals("123660.00", "123661.00")` → `false`.
3. **`src/server/services/checkout/payment-charge.decision.ts`** (nuevo, puro):
   - `decideOpenAttemptHandling({ attempt: { provider: string; status: PaymentAttemptStatus; declaredReceiptReference: string | null }; requestedProvider: string }): "reuse" | "replace"`:
     - `"reuse"` si `attempt.provider === requestedProvider` o si `!isCancellablePaymentAttempt(attempt)`;
     - si no, `"replace"`.
     - Precondición documentada: el intento no está vencido (`isSpentPaymentAttempt` da `false`).
4. **`payment-charge.decision.test.ts`**, el reuso con sus casos:
     - mismo medio → `reuse`;
     - MP `pending` sin comprobante, con transferencia pedida → `replace`;
     - MP `inProcess` → `reuse`;
     - externo `pending` con comprobante y MP pedido → `reuse`;
     - externo `pending` sin comprobante y MP pedido → `replace`.

### 7.2. Configuración y lectura pública

5. **`src/schemas/admin/payment.schemas.ts`**, en `externalPaymentSettingsSchema`:
   ```ts
   transferDiscountPercent: z.coerce
     .number()
     .min(0, "El descuento no puede ser negativo")
     .max(TRANSFER_DISCOUNT_MAX_PERCENT, "El descuento no puede superar el 50 %")
     .refine((value) => Math.round(value * 100) === value * 100, "Usá hasta dos decimales")
     .default(0),
   ```
6. **`external-payment-config.service.ts`:**
   - `defaultExternalPaymentSettings.transferDiscountPercent = 0`.
   - `getPublicTransferDiscountPercent(database): Promise<number | null>`: `const config = await getExternalPaymentConfig(database); return config.enabled ? normalizeTransferDiscountPercent(config.settings.transferDiscountPercent) : null;`
   - Test en un `external-payment-config.service.test.ts` nuevo, con `database` falso:
     - deshabilitado → `null`;
     - 0 → `null`;
     - 10 → `10`;
     - settings viejos sin el campo → `null`.
7. **`src/schemas/catalog.schemas.ts`:** `transferDiscountSchema = z.object({ percent: z.number().positive().max(50).nullable() })`.
8. **`catalog.router.ts`:** `transferDiscount: publicProcedure.output(transferDiscountSchema).query(async () => ({ percent: await getPublicTransferDiscountPercent(db) }))`. Doc de una línea: "Only the percent, and only while the external provider is enabled (ADR 0013)."

### 7.3. Datos

9. **`prisma/schema.prisma`**, `model UserTransaction`, después de `amount`:
   ```prisma
   // Transfer discount frozen at confirmation (ADR 0013). All three null on Mercado Pago
   // attempts and on attempts without a discount; `amount` is what is charged either way.
   subtotalAmount          Decimal? @db.Decimal(18, 2)
   transferDiscountPercent Decimal? @db.Decimal(5, 2)
   transferDiscountAmount  Decimal? @db.Decimal(18, 2)
   ```
10. **Migración** `prisma/migrations/<timestamp>_transfer_discount_on_payment_attempt/migration.sql`. El timestamp tiene que ser posterior a la última migración de `main` al implementar (WP-D también agrega migraciones).
    ```sql
    -- Additive only, no backfill: existing attempts had no transfer discount.
    ALTER TABLE "user_transaction"
      ADD COLUMN "subtotalAmount" DECIMAL(18,2),
      ADD COLUMN "transferDiscountPercent" DECIMAL(5,2),
      ADD COLUMN "transferDiscountAmount" DECIMAL(18,2);
    ALTER TABLE "user_transaction" ADD CONSTRAINT "user_transaction_transfer_discount_all_or_none"
      CHECK (("subtotalAmount" IS NULL) = ("transferDiscountPercent" IS NULL)
         AND ("subtotalAmount" IS NULL) = ("transferDiscountAmount" IS NULL));
    ```
    Generar con `pnpm db:migrate-dev --create-only` contra la DB **local** y agregar el CHECK a mano, como en `20261009000000_customer_delivery_preference`. **No** aplicarla en la DB compartida: eso lo hace Flavio.
11. **`checkout.data.ts`:**
    - `orderTransactionSelect` suma `subtotalAmount`, `transferDiscountPercent` y `transferDiscountAmount`.
    - `createPendingTransaction` recibe `transferDiscount?: TransferDiscountBreakdown | null` y escribe las 3 columnas solo si no es `null`.
    - `cancelOtherPendingAttempts(db, { userOrderId, keepTransactionId })`: hace un `updateMany` con `where: { userOrderId, id: { not: keepTransactionId }, status: "pending", declaredReceiptReference: null }` y `data: { status: "cancelled", cancelledAt: new Date() }`. Devuelve el `count`.
12. **`payment.data.ts`:** `paymentAttemptListSelect` suma las 3 columnas. El detalle las hereda.

### 7.4. Schemas de checkout y pedido

13. **`src/schemas/checkout.schemas.ts`:**
    - `checkoutStateSchema` suma `transferDiscountPercent: z.number().positive().max(50).nullable()`.
    - `checkoutConfirmInputSchema` suma `expectedAmount: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/, "Monto inválido")`. Doc: "The amount the screen showed for the chosen payment method".
    - Schema común `attemptTransferDiscountFields = { subtotalAmount: decimalOutputSchema.nullable(), transferDiscountPercent: decimalOutputSchema.nullable(), transferDiscountAmount: decimalOutputSchema.nullable() }`. Se agrega a `checkoutPaymentResultSchema.transaction` y a `orderDetailSchema.transactions[]`.
    - `paymentAttemptListItemSchema` (`payment.schemas.ts:52`) suma los mismos 3 campos.
    - Revisar que todos los `.parse` de fixtures, incluido el tutorial (paso 30), pasen esos campos en `null`.

### 7.5. `confirmAndPay` y el estado del checkout

14. **`start` y `getState`** (`checkout.service.ts:439-510`): suman `transferDiscountPercent: externalConfig.enabled ? normalizeTransferDiscountPercent(externalConfig.settings.transferDiscountPercent) : null`. Ya tienen `externalConfig`, así que no hace falta otra lectura.
15. **`confirmAndPay`** (`checkout.service.ts:711-896`). El orden importa:
    1. `getExistingPaymentResult` por `idempotencyKey` **queda primero y sin cambios**: un reintento con la misma clave nunca se compara contra el monto.
    2. Dentro de la transacción, después de `resolvePaymentProviderConfig`, calcular `const charge = decideAttemptCharge({ provider: providerConfig.provider, subtotal: total.amount, currency: total.currency, transferDiscountPercent: providerConfig.provider === "external" ? providerConfig.config.settings.transferDiscountPercent : null })`. El % se lee en la misma transacción, así que queda fijo al confirmar (P5).
    3. Si hay `liveOrder` y `latestAttempt` no vencido:
       - `decideOpenAttemptHandling({ attempt: latestAttempt, requestedProvider: providerConfig.provider })`;
       - con `"reuse"`, el return `existing` de hoy, sin cambios y **sin** comparar montos: el intento conserva su monto;
       - con `"replace"`, `await cancelTransaction(tx, latestAttempt.id)` y seguir al paso 5 sobre el mismo `liveOrder`.
    4. La guarda de `!liveOrder && cart.status !== "atCheckout"` queda igual.
    5. **Antes de crear el pedido o el intento:** `if (!moneyEquals(input.expectedAmount, charge.amount)) throw new TRPCError({ code: "CONFLICT", message: \`El total cambió: ahora pagás ${formatCurrency(charge.amount, total.currency)}. Revisalo y confirmá de nuevo.\` })`. El throw deshace todo lo de la transacción, incluida la cancelación del paso 3 y el cambio de entrega. El texto usa el espacio de `Intl`; los tests lo comparan con `\s`.
    6. `createPendingTransaction` con `amount: charge.amount` y `transferDiscount: charge.transferDiscount`. `requestSnapshot` suma `subtotal: total.amount` y `transferDiscount: charge.transferDiscount`.
    7. La rama de MP queda **igual**: `prepared.transaction.amount` es el subtotal, y `createMercadoPagoPreference` arma las líneas del carrito. La rama externa usa `prepared.transaction.amount` (con descuento) en `markTransactionAsExternalPending` y en las instrucciones, igual que hoy.
    - Actualizar el JSDoc de `confirmAndPay` y de `buildReusedAttemptMessage`: el reuso ahora depende del medio.
16. **`buildPaymentResult`** y **`toOrderDetail`:** pasan los 3 campos del intento (`.toString()` o `null`) al schema.
17. **Completar un pago (G3).** En `submitOrderForCompletedPayment` (`order-submission.service.ts`), después de `updateOrderStatus`, llamar a `cancelOtherPendingAttempts(tx, { userOrderId: input.orderId, keepTransactionId: input.transactionId })`. Doc de una línea: "A switch of payment method can leave an older attempt payable (ADR 0013); once one is paid, no other may be offered."

### 7.6. Lo que ve el cliente

18. **`src/features/cart/_components/transfer-total.tsx`** (nuevo, presentacional, sin hooks de datos):
    - `TransferTotalHint({ total, percent }: { total: { amount: string; currency: CatalogCurrency }; percent: number | null })`. Renderiza `<p className="text-muted-foreground text-xs tabular-nums">Con transferencia: {formatCurrency(breakdown.total, currency)}</p>`, o nada si `applyTransferDiscount` da `null`.
    - `TransferDiscountBreakdownRows({ breakdown, currency, totalLabel })`: tres filas, "Subtotal productos", "Descuento por transferencia ({percent} %)" con "−$ X" y `{totalLabel}` en negrita. El % se formatea con `Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 })`, así 7,5 % sale con coma.
19. **Ficha:**
    - `PurchasePrice` (`purchase-panel.tsx`) suma `transferDiscountPercent?: number | null`. Si `getTransferStepPrice(...)` da un valor, renderiza `<p className="font-medium text-sm tabular-nums">{formatCurrency(x)} pagando con transferencia</p>` **inmediatamente debajo** de la línea del precio por paso y antes del comparativo. Necesita el precio por paso numérico: usar `getPerStepPrice(terms)`, así que `PurchasePrice` recibe `terms` o el número ya calculado desde `PurchasePanel`; elegir lo que menos toque la firma que dejó WP-C.
    - `PurchasePanel` y `CatalogProductPurchase` pasan el prop.
    - **Solo** `product-details-dialog.tsx` lo pasa, con `api.catalog.transferDiscount.useQuery(undefined, { staleTime: 5 * 60_000 })` y `percent ?? null`. `ProductCard`, `HomeOfferCard` y `ProductMiniCard` no lo pasan.
20. **Pedido:**
    - `cart-client.tsx` y `cart-sheet.tsx` leen `api.catalog.transferDiscount.useQuery(...)` (pública: sirve también para invitados).
    - `CartPageView` → `CartSummary` y `CartSheetView` reciben `transferDiscountPercent: number | null` (requerido, para que el tutorial no lo olvide).
    - Debajo de cada fila de "Total estimado", `<TransferTotalHint total={total} percent={transferDiscountPercent} />`.
21. **Checkout** (`checkout-client.tsx`):
    - `const transferDiscountPercent = checkout.transferDiscountPercent`.
    - `const chargedTotal = selectedPaymentMethod && liveCart.totals[0] ? decideAttemptCharge({ provider: selectedPaymentMethod.provider, subtotal: liveCart.totals[0].amount, currency: liveCart.totals[0].currency, transferDiscountPercent }) : null`. `decideAttemptCharge` sale de `~/shared/common/transfer-discount` (paso 1).
    - `handleConfirm` manda `expectedAmount: chargedTotal.amount`.
    - `confirmAndPay.onError`: si `error.data?.code === "CONFLICT"`, `const state = await utils.checkout.getState.fetch(); replaceCart(state.cart, syncedUserId);`, `toast.error(error.message)` y quedarse en "Confirmar". La `idempotencyKey` no cambia, porque no se creó nada.
    - `CheckoutPaymentStep` recibe `total` (`liveCart.totals[0]`) y `transferDiscountPercent`. El mosaico del medio `external` suma, debajo de la descripción, `<span className="font-medium text-sm tabular-nums">{formatCurrency(breakdown.total)} con {p} % de descuento</span>` si hay descuento. El de MP no cambia.
    - `CheckoutSummary`, `CheckoutReviewStep` y `CheckoutMobileBar` reciben `transferDiscountPercent`:
      - con un medio `external` elegido y descuento, `TransferDiscountBreakdownRows` en lugar de la fila del total, con `totalLabel="Total"`. La barra mobile muestra `breakdown.total`;
      - sin medio elegido, o con MP, "Total estimado" + `TransferTotalHint`.
      - `CheckoutOrderStep` muestra el hint debajo de su "Total estimado".
    - `CheckoutResultPanel`: si `result.transaction.transferDiscountAmount !== null`, debajo de "Monto" agrega "Incluye {p} % de descuento por transferencia (−$ X)".
22. **"Mis pedidos"** (`order-detail-view.tsx`, solo la tarjeta "Resumen", `:196-204`; **no** tocar el encabezado ni las líneas que dejó WP-G):
    - Si `latestTransaction?.transferDiscountAmount` existe, en lugar de la fila "Monto" va `TransferDiscountBreakdownRows` con `totalLabel` = "Total pagado" si `latestTransaction.status === "completed"` y "Total a transferir" si no (G4).
    - Si no existe, la fila "Monto" queda como hoy.
    - La lista de "Mis pedidos" no cambia: ya muestra el monto del intento.

    ```
    Resumen
      Items                                 1
      Subtotal productos            $ 137.400
      Descuento por transferencia (10 %) −$ 13.740
      Total pagado                  $ 123.660
    ```

### 7.7. Admin de pagos

23. **`ExternalConfigEditor`** (`payments-admin-client.tsx:688-830`), un `Field` nuevo en la grilla:
    - label "Descuento por transferencia (%)";
    - `Input type="number"` con `min={0}`, `max={50}`, `step="0.01"` e `id="external-transfer-discount"`;
    - `onChange` → `setSetting("transferDiscountPercent", Number(event.target.value))`;
    - `FieldDescription`: "Se descuenta del total de los productos cuando el cliente paga por transferencia. 0 = sin descuento. Solo lo cambia un superadmin."

    El error de validación del servidor ya sale por el toast de `onError`.
24. **Columna "Monto"** (`:966-968`): el monto y, si `item.transferDiscountPercent` no es nulo, debajo `<span className="text-muted-foreground text-xs">−{p} % transf.</span>`.
25. **`AttemptDetail`** (`:183-360`), un bloque nuevo arriba de la grilla:
    - si es externo: "A cobrar en el banco" con `formatCurrency(attempt.amount)` en `font-heading font-semibold text-base`;
    - si es MP: "Monto";
    - si tiene descuento, debajo `TransferDiscountBreakdownRows` con `totalLabel="A cobrar en el banco"`, reutilizando el componente del paso 18.

    ```
    Detalle del intento #812
      A cobrar en el banco          $ 123.660
      Subtotal productos            $ 137.400
      Descuento por transferencia (10 %) −$ 13.740
    ```

### 7.8. Términos

26. **`checkout-terms.ts`:** `version: "checkout-v4"` y el texto de §13, **recién cuando Flavio lo apruebe**. Mientras tanto, el implementador deja la versión y el texto en un commit aparte, al final de la rama, para poder ajustarlo sin tocar el resto.
27. **`checkout-terms.test.ts`:** espera `"checkout-v4"` y que el texto contenga "descuento" y "redondea".

### 7.9. Companions

28. **Glosario del admin** (`src/features/admin/glossary/data/payments.ts`), entrada `concepto-descuento-por-transferencia`:
    - `kind: "concept"`, `section: "payments"`, `label: "Descuento por transferencia"` y `term: "Transfer discount"`;
    - definición en castellano, tomada de `CONTEXT.md`;
    - `aliases: ["Descuento de pago", "Descuento de oferta", "Promoción"]`;
    - `occurrences` con los tres campos de `UserTransaction` y `PaymentProviderConfig.settings` (`payment_provider_config.settings`);
    - `href: "/admin/payments"`.
29. **`docs/schema-reference.md`:** subsección "`UserTransaction` transfer-discount columns (ADR 0013)" después de la de pagos externos (~`:203-215`), con una tabla de las 3 columnas y el CHECK. Aclarar que `amount` sigue siendo lo que se cobra.
30. **Tutorial (ADR 0012):**
    - `tutorial-fixtures.ts`:
      - `TUTORIAL_TRANSFER_DISCOUNT_PERCENT = 10` exportada;
      - `checkoutState.transferDiscountPercent = 10`;
      - los 3 campos nuevos en `null` en `paymentResult.transaction` y en `orderDetail(...).order.transactions[0]`, porque el tutorial paga con MP.
    - Escenas:
      - `cart-scene.tsx` → `transferDiscountPercent={TUTORIAL_TRANSFER_DISCOUNT_PERCENT}`;
      - `catalog-scene.tsx` (`CartSheetView`), lo mismo;
      - `checkout-scene.tsx` pasa `checkoutState.transferDiscountPercent` a `CheckoutPaymentStep`, `CheckoutSummary`, `CheckoutReviewStep` y `CheckoutOrderStep`.
      - La escena de pago tiene MP elegido, así que el resumen sigue en $ 34.900 con el hint "Con transferencia: $ 31.410".
    - `tutorial-script.ts`:
      - `cartSummary.body` → "Acá ves el total estimado y, debajo, cuánto pagás si elegís transferencia. Para pagar te pedimos ingresar con tu cuenta de Google.";
      - `checkoutPayment.body` → "Con Mercado Pago pagás con tarjeta, dinero en cuenta o efectivo. Si preferís transferir, elegí pago externo: ves el total con el descuento y te damos los datos al confirmar."
      - Ninguno nombra el %, para no mentir si el real es otro (S4). Los contadores no cambian.
    - `tutorial-fixtures.test.ts`: `applyTransferDiscount({ subtotal: total.amount, percent: 10, currency: "ARS" })?.total === "31410.00"`. El total del pedido y del pago sigue en `34900.00`.
    - `e2e/customer-tutorial.spec.ts`:
      - en `/tutorial?version=rapido&paso=5` se ve `getByText(/Con transferencia: \$\s?31\.410/)`;
      - en `paso=8`, el mosaico de pago externo muestra `/\$\s?31\.410 con 10 % de descuento/`.

## 8. Testing

**Tests nuevos o actualizados**, todos con `pnpm test`:

| Test | Afirma |
| --- | --- |
| `transfer-discount.test.ts` | Paso 2: redondeo hacia abajo, decimales del %, ARS solamente, límites. |
| `payment-charge.decision.test.ts` | Paso 4: la matriz de reuso o reemplazo. (MP sin descuento y la comparación en centavos están en `transfer-discount.test.ts`.) |
| `external-payment-config.service.test.ts` | Paso 6: lectura pública. |
| **`checkout.payment-switch.test.ts`** (nuevo, con mocks al estilo de `checkout.delivery-refresh.test.ts`) | Ver la lista de abajo. |
| `order-submission` (sumar a su test, o crear `order-submission.service.test.ts`) | Completar un pago llama a `cancelOtherPendingAttempts` con el pedido y el intento correctos (G3). |
| `checkout.transaction-queries.test.ts`, `checkout.delivery-refresh.test.ts` | Agregar `expectedAmount` a sus inputs; siguen en verde. |
| `mercadopago-preference.decision.test.ts` | Sin cambios; tiene que seguir en verde. |
| `checkout-terms.test.ts`, `tutorial-fixtures.test.ts`, `tutorial-script.test.ts`, `glossary.data.test.ts` | Pasos 27, 30 y 28. |

**Lo que cubre `checkout.payment-switch.test.ts`** (el pedido explícito del orquestador sobre §3):
1. **Idempotencia:** con un intento existente para `idempotencyKey = K`, llamar de nuevo con `K` y un `expectedAmount` distinto devuelve **el mismo intento**. No se llama a `createPendingTransaction`, a `cancelTransaction` ni a `createUserOrder`.
2. **Un pedido vivo por carrito:** con un pedido vivo con un intento MP `pending` sin comprobante, confirmar con "Pago externo" llama a `cancelTransaction(MP)` y a `createPendingTransaction` con `userOrderId` = el **mismo** pedido, y **no** llama a `createUserOrder`.
3. **Invariante de MP:** con el % externo en 10, confirmar con MP crea el intento con `amount` = la suma de líneas (`"500.00"` en el fixture de `delivery-refresh`) y sin descuento. `createMercadoPagoPreference` recibe ese intento, y `buildMercadoPagoPreferenceCreateData` (real, sin mock) no tira `MercadoPagoPreferenceInvariantError` con las líneas del carrito y ese monto.
4. **Transferencia con descuento:** `createPendingTransaction` recibe `amount: "450.00"`, y `transferDiscount` con `percent: 10`, `subtotal: "500.00"`, `discount: "50.00"` y `total: "450.00"`. `markTransactionAsExternalPending` y las instrucciones usan `450.00`.
5. **Monto distinto:** con `expectedAmount: "500.00"` y transferencia al 10 %, el resultado es `CONFLICT`, el mensaje contiene `$\s?450`, y no se llama a `createPendingTransaction` ni a `createUserOrder`.
6. **Reuso del mismo medio:** con un intento externo `pending` y otra vez "Pago externo", se devuelve el intento existente aunque `expectedAmount` no coincida (por ejemplo, porque el % cambió). No se cancela nada.
7. **Intento no cancelable:** con un MP `inProcess` y "Pago externo" pedido, se devuelve el MP sin cancelar. Con una transferencia con comprobante y MP pedido, lo mismo.

**e2e** contra la DB local (§9 y §10 de la orquestación): `pnpm test:e2e e2e/customer-tutorial.spec.ts e2e/smoke.spec.ts`. El checkout real no tiene e2e porque el login es solo con Google (mismo precedente que WP-G). Lo cubren los tests de servicio y el Re-test.

**Revisión manual** con un superadmin, un cliente y la DB local:
- cargar 10 % en "Pago externo";
- la ficha del bidón dice "$ 123.660 pagando con transferencia" y la tarjeta no;
- `/cart` y el mini-pedido muestran "Con transferencia: $ X";
- en el checkout, el mosaico de "Pago externo" muestra el monto y el resumen cambia al elegirlo;
- confirmar → los datos de transferencia con $ 123.660;
- en "Mis pedidos", el desglose con "Total a transferir";
- en `/admin/payments`, "Monto $ 123.660 · −10 % transf." y "A cobrar en el banco" con el desglose;
- liquidar → "Total pagado";
- cambiar el % con el checkout abierto y confirmar → aviso con el monto nuevo;
- con MP elegido y la ventana de MP cerrada, "Reintentar" con "Pago externo" → transferencia por el monto con descuento;
- el % en 0 → no se ve nada.

**Mini review:** `q-review-code` (dos ejes) y `q-review-comments`.

## 9. Rollout y rollback

1. Se mergea la rama (con `checkout-v4` aprobado).
2. **Flavio** aplica la migración en la DB compartida (`pnpm db:migrate`). Es aditiva y no tiene backfill.
3. Deploy del código.
4. Un superadmin carga el % en "Pago externo". Mientras esté en 0, nada cambia para el cliente: es el interruptor natural.

**Rollback:**
- **Funcional:** poner el % en 0. No se muestra ni se aplica, y los intentos ya creados conservan su monto.
- **De código:** revertir el merge. Las columnas quedan nulas y sin uso, y no hace falta bajar la migración. Si se revierte después de haber cobrado transferencias con descuento, el detalle de esos pedidos vuelve a mostrar solo "Monto" (el monto con descuento): la plata es correcta, solo se pierde el desglose en pantalla.

## 10. Riesgos y trampas

| # | Riesgo | Mitigación |
| --- | --- | --- |
| R1 | El cliente cambia de MP a transferencia, pero la preferencia vieja de MP se puede pagar hasta que vence. Si MP la aprueba tarde, el intento cancelado pasa a `completed` (`shouldApplyMercadoPagoPaymentStatus`) y el pedido se confirma. | G3 (paso 17): al completarse, se cancelan los demás intentos pendientes sin comprobante, y el pedido deja de ofrecer los datos de transferencia. Si el cliente ya había informado el comprobante, el admin ve los dos y rechaza el que corresponda. "Volver a editar el pedido" ya tenía este riesgo. |
| R2 | El store del carrito del cliente tiene un precio viejo y la confirmación da `CONFLICT`. | Es lo deseado (G2). El cliente ve el monto nuevo, el carrito se refresca desde `getState` y vuelve a confirmar con la misma clave. |
| R3 | Los montos con decimales hacen que los centavos de la ficha y del pedido no coincidan. | S5: diferencia de $ 1 como máximo, y manda el pedido. Los tests del paso 2 fijan la regla. |
| R4 | WP-C cambió la firma de `PurchasePrice` y del panel. | Partir de `main` con WP-C. El paso 19 elige la forma de pasar el precio por paso que menos toque. |
| R5 | WP-G cambió `order-detail-view.tsx`. | El paso 22 toca solo la tarjeta "Resumen". Rebasear sin pisar el encabezado ni las líneas. |
| R6 | `checkout-v4` no está aprobado al terminar. | El commit de términos va último (paso 26). Sin aprobación, no se mergea: queda frenado en §13 de la orquestación. |
| R7 | Un pedido viejo, confirmado con `checkout-v3`, se paga después del deploy con transferencia y descuento. | Los términos aceptados son los de la confirmación (*Terms acceptance*). Es aceptable: el descuento favorece al cliente. Queda anotado. |
| R8 | El `CONFLICT` por monto rompe un cliente viejo cacheado que no manda `expectedAmount`. | El schema lo exige, así que un cliente viejo recibe un `BAD_REQUEST` claro y recarga. El deploy reemplaza el cliente. |

## 11. Documentación

Aplicado en el grill:
- `docs/adr/0013-transfer-discount-is-an-attribute-of-the-payment-attempt.md`;
- `CONTEXT.md`: *Transfer discount* (nuevo), *Payment attempt*, *Offer price*, *Offer discount* y *Checkout*.

Lo hace el implementador:
- glosario del admin (paso 28);
- `docs/schema-reference.md` (paso 29);
- el registro de ejecución en este plan y en §13 de la orquestación.

## 12. Preguntas abiertas

Ninguna de comportamiento. Queda **un insumo bloqueante**: la aprobación del texto `checkout-v4` (§13).

## 13. Texto `checkout-v4` (aprobado por Flavio el 13/11/2026)

> **Aprobado el 13/11/2026:** Flavio aprobó este texto tal cual. También aprobó G2 (el chequeo del monto mostrado vale para Mercado Pago y para la transferencia) y G3 (al acreditarse un pago se cancelan los otros intentos pendientes del pedido sin comprobante informado).

Cambian las cláusulas 1, 3 y 4. Las demás quedan igual. El texto no nombra el %, porque es configurable: si dijera "10 %", habría que subir la versión cada vez que cambia.

**Cláusula 1, Objeto**

Antes:
> 1. Objeto. Al confirmar el pedido, el cliente compra los productos detallados en el resumen, en las cantidades y precios que allí figuran. Cada línea se cobra al precio por unidad multiplicado por la cantidad, e incluye los impuestos indicados.

Después:
> 1. Objeto. Al confirmar el pedido, el cliente compra los productos detallados en el resumen, en las cantidades y precios que allí figuran. Cada línea se cobra al precio por unidad multiplicado por la cantidad, e incluye los impuestos indicados. Si pagás por transferencia, al total se le aplica el descuento de la cláusula 3.

**Cláusula 3, Pago**

Antes:
> 3. Pago. El pedido queda confirmado cuando el pago se acredita. Los pagos con Mercado Pago se acreditan cuando el proveedor de pagos los aprueba. Las transferencias se acreditan cuando el equipo de administración verifica el comprobante. Mientras el pago no se acredite, el pedido queda pendiente y no se reserva mercadería.

Después:
> 3. Pago. El pedido queda confirmado cuando el pago se acredita. Los pagos con Mercado Pago se acreditan cuando el proveedor de pagos los aprueba. Las transferencias se acreditan cuando el equipo de administración verifica el comprobante. Mientras el pago no se acredite, el pedido queda pendiente y no se reserva mercadería. Si pagás por transferencia, tenés el descuento que se informa en el paso de pago. Se calcula sobre el total de los productos, no sobre el envío, y el monto se redondea al peso entero a tu favor. El porcentaje queda fijo al confirmar el pedido. Si después pagás con otro medio, el descuento no se aplica.

**Cláusula 4, Disponibilidad y ajustes**

Antes:
> 4. Disponibilidad y ajustes. Si el proveedor entrega menos cantidad que la pedida, la diferencia se reprograma para una próxima operación o se cancela. Te avisamos en el seguimiento del pedido, con el motivo. Nunca se cobra una cantidad que no se entrega.

Después:
> 4. Disponibilidad y ajustes. Si el proveedor entrega menos cantidad que la pedida, la diferencia se reprograma para una próxima operación o se cancela. Te avisamos en el seguimiento del pedido, con el motivo. Nunca se cobra una cantidad que no se entrega. Si el pedido se pagó por transferencia, lo que se reintegra lleva el mismo descuento que se cobró.

El encabezado "TEXTO DE PRUEBA — …" y las cláusulas 2 y 5 a 10 no cambian.

## 14. Estado de QA al terminar

Cargar la transición en `scripts/qa-ticket-triage.data.ts` (WP0). La nota va **arriba**, sin borrar las anteriores.

- **#110 → Re-test.** Nota:
  > `[fecha · triage] Implementado en <commit>. Mirar: con "Descuento por transferencia (%)" en 10 en /admin/payments → Pago externo, la ficha desplegada muestra "$ X pagando con transferencia" (la tarjeta no); Tu pedido y el mini-pedido muestran "Con transferencia: $ X" debajo del total; en el checkout, el mosaico "Pago externo" muestra el total con el descuento y el resumen pasa a subtotal, descuento y total; los datos de transferencia piden ese monto; Mis pedidos muestra el desglose; el admin ve "Monto" con "−10 % transf." y "A cobrar en el banco" en el detalle. Con MP no hay descuento. Montos redondeados hacia abajo al peso. Precondiciones: superadmin para cargar el %; pago externo habilitado; cliente con pedido armado.`

## 15. Hecho significa

- Los pasos 1 a 30 implementados en una rama de WP-F, con commits chicos y los términos al final.
- `pnpm typecheck`, `pnpm test` y `pnpm check` en verde, con los tests de §8 (incluidos los tres de §3).
- Los e2e del tutorial y del smoke en verde contra la DB local.
- La revisión manual de §8 hecha.
- La mini review aplicada.
- `checkout-v4` aprobado por Flavio.
- El merge `--no-ff` a `main`.
- El registro de ejecución en este plan y una fila en §13 de la orquestación.
- La transición de §14 cargada en el script de triage.
- La migración la aplica Flavio antes del deploy.

## 16. Instrucciones para el implementador

- Leé el ADR 0013, este plan y las entradas de `CONTEXT.md` (*Transfer discount*, *Payment attempt* y *Checkout*) antes de arrancar.
- Trabajá en un worktree. **No** toques la DB compartida: usá la local para la migración y los e2e.
- Empezá por los pasos 1 a 4 (lógica pura con sus tests). Seguí con los datos (9 a 12), el servidor (13 a 17) y la UI (18 a 25). Dejá los términos (26 y 27) al final, en su propio commit.
- Si el código de `main` ya no coincide con las líneas citadas (WP-A, WP-C y WP-G mergeados), guiate por los símbolos, no por los números de línea.
- Cualquier cambio en `mercadopago-preference.*` está **fuera de alcance**. Si un test de MP se pone rojo, el problema está en el monto del intento, no en la preferencia.
- Los textos al cliente van en castellano rioplatense y dicen "pedido", nunca "carrito". "Pago externo" sigue siendo el nombre del medio.
