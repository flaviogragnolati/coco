# Plan reducido: WP-G, repetir pedido (#112)

> **Estado:** Implementado en la rama `wpg-repeat-order` (13/11/2026), sin mergear. Faltan el merge, los e2e contra la DB local y la transición de QA (ver §11). Simple grill del 13/11/2026. Flavio contestó las 5 preguntas a través del orquestador y eligió la opción recomendada en todas.
> **Origen:** `docs/plans/qa-open-tickets-2026-11-orchestration.md` (§6 WP-G, §7) y la fila #112 de `docs/plans/qa-open-tickets-2026-11-report.md`.
> **Base:** `main` en `055450f`. Si WP-D o WP-F ya se mergearon cuando arranque este WP, rebasear sobre `main` (ver §7, archivos compartidos).

## 1. Objetivo

En el detalle de un pedido de "Mis pedidos", el cliente toca **"Repetir pedido"**. Se abre un diálogo que lista los productos de ese pedido:
- con la cantidad y el precio de hoy;
- todos marcados;
- los que ya no se venden aparecen deshabilitados con "Ya no disponible".

Al confirmar, los productos elegidos se suman a "Tu pedido" y el cliente va a `/cart`, donde lo edita y lo confirma por el camino de siempre. El pedido original no cambia y nada se confirma solo. Además, cada línea del detalle muestra el precio que se pagó: "1,5 kg × $ 22.600 / kg".

## 2. Decisiones

| Tema | Decisión | Fuente |
| --- | --- | --- |
| Elegir antes de sumar | Un diálogo con casillas, todas marcadas. Cada línea muestra la cantidad y el precio de hoy. Las no disponibles van deshabilitadas, sin marcar y con "Ya no disponible". Al confirmar se suman a "Tu pedido" y se va a `/cart`. | Flavio, 13/11 (P1, opción 1) |
| Lo que ya está en "Tu pedido" | **Se suma.** Si el producto ya está, las cantidades se acumulan y se ajustan al tamaño de compra y al tope. No se reemplaza nada. | Flavio, 13/11 (P2, opción 1) |
| Precio registrado en el detalle | La línea de la cantidad pasa a "cantidad × precio por unidad". Si tenía descuento, va el precio con descuento. El total de la línea queda como está. | Flavio, 13/11 (P3, opción 1) |
| Pedido esperando el pago | **No se deja repetir.** El diálogo muestra un aviso con un enlace a ese pedido y no se cancela nada. El servidor rechaza igual si alguien llama a la mutación. | Flavio, 13/11 (P4, opción 1) |
| Dónde y en qué pedidos | Solo en el **detalle**, en todos los estados menos **"Pendiente"**. La tarjeta de la lista no cambia. | Flavio, 13/11 (P5, opción 1) |
| Función reutilizable | `addItems(userId, items)` en `cart.service.ts`. Es aditiva, recibe **id de producto** + cantidad, resuelve los términos vigentes y pasa por `ensureCartMutable`. WP-D la reutiliza para "Sumar combo". | Orquestador, 13/11 |
| Acción aditiva en el store | `addItems(items)` en `cart-store.ts`, que acumula en vez de pisar. WP-G no la usa: la deja para WP-D. | Orquestador, 13/11 |
| Tutorial | El botón entra como **slot opcional** de `OrderDetailView`. La página real lo pasa y la escena del tutorial no. Sin pasos nuevos; los contadores "1 / 12" y "19 / 21" no cambian. | Orquestador, 13/11 |
| Vocabulario | "Mis compras" y "Repetir compra" del ticket se dicen "Mis pedidos" y "Repetir pedido". En los textos al cliente no aparecen "carrito", "MOQ", "step" ni "máximo" (`customer-vocabulary-pedido.md`). | §6 de la orquestación |

**Resuelto con el código, no se pregunta:**
- No hay pedidos de invitado. `/my-orders` exige sesión y todo el router del carrito es `protectedProcedure`.
- La lista ya ordena "Más recientes" por defecto (`my-orders-client.tsx:47`).

## 3. Alcance

**Entra:**
- La vista del detalle del pedido: el slot del botón y la línea "cantidad × precio".
- El diálogo "Repetir pedido".
- `orders.repeatPreview` y `orders.repeat`.
- `addItems` (servicio y store).
- Las consultas de términos vigentes por producto.
- Los tests, el fixture del tutorial, un e2e y `CONTEXT.md` (ya aplicado).

**No entra:**
- Cambios en la tarjeta de la lista de "Mis pedidos".
- Avisos de "el precio cambió" (fue la opción 3 de la P3, descartada).
- Un endpoint `cart.addItems`, que lo expone WP-D cuando lo necesite.
- Combos (WP-D).
- Descuento por transferencia (WP-F).
- Cambios a `syncLocal`, `setItemQuantity` o al checkout.
- Glosario del admin: no hay entidad, estado ni ítem de navegación nuevos, así que el drift test no pide nada.

**No hay que romper:**
- La regla de un pedido vivo por carrito y la idempotencia de `confirmAndPay`. Repetir pedido nunca libera un checkout que tenga un pedido vivo.
- `ensureCartMutable`, que sigue siendo la única puerta para modificar el carrito.
- El pedido original y sus snapshots: solo se leen.
- El tutorial (ADR 0012): `/tutorial` no monta el diálogo ni hace llamadas tRPC.
- Los textos de "Mis pedidos" que no se tocan.

## 4. Pasos (en orden)

### 4.1. Lógica pura y tests primero

1. **`src/shared/common/product-snapshot.ts`**, junto a `readSnapshotQuantityUnit`:
   - `readSnapshotProduct(snapshot): { id: number | null; name: string }`. Lee `product.id` (entero positivo, si no `null`) y `product.name` (si falta, `"-"`).
   - `readSnapshotUnitPrice(priceSnapshot): { unitPrice: number; currency: CatalogCurrency } | null`. Lee `priceSnapshot.productClientTerms` y aplica `getPerUnitPrice` (con descuento, ADR 0008). Devuelve `null` si faltan los términos o el precio no se puede calcular. Los snapshots viejos y el fixture actual del tutorial no traen términos.
   - Tests en `product-snapshot.test.ts`:
     - id válido;
     - id ausente o no numérico;
     - precio con y sin descuento;
     - términos legados sin `unitPrice` (cae a `moqPrice / moq`);
     - sin `productClientTerms`, devuelve `null`.
2. **`src/shared/common/order-display.ts`**:
   - `canRepeatOrder(status: OrderStatus): boolean`, que es `status !== "pending"`.
   - `formatOrderLineQuantityPrice({ quantity, productSnapshot, priceSnapshot }): string`. Arma `formatQuantity(...)` con la unidad y la presentación de `readSnapshotQuantityUnit` y le agrega el precio:
     - peso (`isWeightUnit`): `" × " + formatCurrency(unitPrice) + " / " + productUnitLabelMap[unit]`, por ejemplo "1,5 kg × $ 22.600 / kg";
     - el resto: `" × " + formatCurrency(unitPrice) + " c/u"`, por ejemplo "2 frascos 500 g × $ 6.500 c/u";
     - si `readSnapshotUnitPrice` da `null`, solo la cantidad, como hoy.
   - Tests en `order-display.test.ts` (crearlo si no existe):
     - `canRepeatOrder` con los 7 estados;
     - kg;
     - frasco;
     - descuento del 10 % sobre $ 22.600, que da "$ 20.340 / kg";
     - snapshot sin términos.
   - En los asserts, el espacio de `Intl` después de "$" es U+00A0: usar `\s` o construir el esperado con `formatCurrency`.
3. **`src/server/services/cart/cart-additions.decision.ts`** (nuevo, puro, sin `server-only`). Es el plan genérico de una suma aditiva; lo reutiliza WP-D.
   - `planCartAdditions({ requests, termsByProductId, existingQuantityByTermsId })`:
     - `requests: { productId: number; quantity: string }[]`;
     - `termsByProductId: Map<number, CatalogClientTerms>`;
     - `existingQuantityByTermsId: Map<number, string>`.
   - Devuelve, por cada `productId` (los repetidos se agrupan sumando antes):
     - `{ productId, outcome: "unavailable" }` si no hay términos;
     - si hay, `{ productId, termsId, quantity, outcome: "added" | "adjusted" }`, donde `quantity = normalizeCartQuantity(existente + pedido, terms)` y `"adjusted"` significa que `!quantitiesEqual(quantity, existente + pedido)`.
   - Tests en `cart-additions.decision.test.ts`:
     - producto nuevo exacto → `added`;
     - fuera del tamaño de compra (0,7 kg con mínimo y paso de 0,5) → 1 kg, `adjusted`;
     - suma con una línea existente (0,5 + 1 → 1,5);
     - recorte al tope;
     - cantidad fija → el mínimo;
     - sin términos → `unavailable`;
     - el mismo producto dos veces → una sola entrada sumada.
4. **`src/server/services/cart/repeat-order.decision.ts`** (nuevo, puro):
   - `collectRepeatLines(items: { quantity: string; productSnapshot: unknown }[])`. Agrupa por `readSnapshotProduct(...).id` y suma las cantidades, manteniendo el orden de la primera aparición. Las líneas sin id quedan aparte, con `productId: null` (se muestran como no disponibles).
   - `decideRepeatGate({ orderStatus, hasWaitingOrder })`, que devuelve `"orderPending" | "waitingOrder" | "allowed"`, en ese orden de prioridad.
   - Tests:
     - la misma línea de producto dos veces (dos términos distintos en el pedido viejo) se suma;
     - snapshot sin id;
     - el orden se mantiene;
     - las tres salidas del gate.
5. **`src/features/cart/cart-mappers.ts`**: `mergeCartItems(current: Record<string, CartItem>, incoming: CartItem[]): Record<string, CartItem>`.
   - Si la clave `productClientTermsId` existe, `quantity = normalizeCartQuantity(actual + entrante, item.terms)` y se recalcula `lineTotal`.
   - Si no existe, se inserta normalizado.
   - Tests en `cart-mappers.test.ts`: suma, inserción y recorte al tope.
6. **`src/features/cart/repeat-order.messages.ts`** (nuevo, puro): `describeRepeatOutcome(lines)` devuelve los textos de los toasts:
   - `success`: "Sumamos 3 productos a tu pedido." o "Sumamos 1 producto a tu pedido.", contando `added` + `adjusted`;
   - `info`, uno por cada `adjusted`: "Ajustamos la cantidad de {name} a lo que se puede comprar hoy.";
   - `warning`, uno por cada `unavailable`: "{name} ya no está disponible.";
   - si no se sumó nada, solo el `warning` "No pudimos sumar ninguno de esos productos."
   - Tests: plurales y los tres tipos.

### 4.2. Servidor

7. **`src/server/services/cart/cart.data.ts`**: `listCurrentClientTermsByProductIds(database, productIds, now)`.
   - Hace un `productClientTerms.findMany` con `where: { ...currentTermsWhere(now), productId: { in: ids }, product: { active: true, deleted: false } }`, `select: cartProductClientTermsSelect` y `orderBy: [{ fromDate: "desc" }, { updatedAt: "desc" }, { id: "desc" }]`. Es el mismo criterio que `catalog.data.ts:99-103`.
   - Con `ids` vacío devuelve `[]`.
   - El servicio se queda con el primero de cada producto.
8. **`src/schemas/cart.schemas.ts`**:
   - `cartAddItemInputSchema = z.object({ productId: z.number().int().positive(), quantity: positiveDecimalStringSchema })`;
   - `cartAddedLineSchema = z.object({ productId, name: z.string(), outcome: z.enum(["added", "adjusted", "unavailable"]), quantity: z.string().nullable() })`;
   - `cartAddItemsOutputSchema = z.object({ cart: cartSnapshotSchema, lines: z.array(cartAddedLineSchema) })`;
   - los tipos se exportan en `src/shared/common/cart.types.ts`, siguiendo el patrón actual.
9. **`src/server/services/cart/cart.service.ts`**:
   - `addItemsInTransaction(tx, userId, items, now)`, exportada:
     - `const cart = await getOrCreateCurrentCart(tx, userId)`, que pasa por `ensureCartMutable`;
     - `listCurrentClientTermsByProductIds`;
     - `listActiveCartItemsByTerms(tx, cart.id, termsIds)`;
     - `planCartAdditions`;
     - un `upsertCartItem` por cada línea que no sea `unavailable`;
     - devuelve `{ cartId, lines }`, con `name` tomado de los términos o, si no está disponible, del pedido de entrada (el llamador lo pasa).
   - `addItems(userId, items: { productId: number; quantity: string; name?: string }[])`, exportada: hace el `$transaction`, llama a `addItemsInTransaction`, lee el carrito con `getCartSnapshot` y valida con `cartAddItemsOutputSchema.parse`.
   - Doc comment corto: la usan "Repetir pedido" y, más adelante, los combos (WP-D).
10. **`src/schemas/repeat-order.schemas.ts`** (nuevo):
    - `repeatOrderPreviewInputSchema = z.object({ orderId: z.number().int().positive() })`;
    - `repeatOrderPreviewSchema = z.discriminatedUnion("state", [...])`, con dos variantes:
      - `{ state: "blocked", waitingOrder: { id, code, totalAmount: string, currency: nullable } }`;
      - `{ state: "ready", lines: [{ productId: number | null, name, available: boolean, quantity: string, quantityLabel: string, lineTotal: string | null, currency: nullable }] }`;
    - `repeatOrderInputSchema = z.object({ orderId, productIds: z.array(z.number().int().positive()).min(1).max(200) })`;
    - salida: `cartAddItemsOutputSchema`.
11. **`src/server/services/cart/repeat-order.service.ts`** (nuevo, `server-only`):
    - Constantes de texto:
      - `REPEAT_ORDER_PENDING_MESSAGE = "Este pedido todavía espera el pago. Vas a poder repetirlo cuando se resuelva."`
      - `REPEAT_BLOCKED_MESSAGE = "Tenés un pedido esperando el pago. Pagalo o volvé a editarlo antes de repetir otro."`
    - `findWaitingOrder(database, userId)`: `findCurrentCartForMutationByUserId`; si `status === "atCheckout"`, `findLiveOrderByCartId` (de `checkout.data.ts`). Devuelve el pedido vivo o `null`. **Cualquier** pedido vivo bloquea: con el pago pendiente, en curso, con la transferencia informada o con un intento fallido que todavía se puede reintentar. Un checkout sin pedido vivo no bloquea, y `ensureCartMutable` lo libera como en cualquier edición.
    - `previewRepeat(userId, orderId)`:
      - `findOrderByUserId(db, ...)`; si no existe, `NOT_FOUND` con "No encontramos ese pedido en tu cuenta.";
      - `decideRepeatGate`: si da `orderPending`, `PRECONDITION_FAILED` con `REPEAT_ORDER_PENDING_MESSAGE`; si da `waitingOrder`, `{ state: "blocked", waitingOrder }` con el monto de `transactions[0]` (igual que `toOrderListItem`, `checkout.service.ts:227-239`);
      - si no, `collectRepeatLines` + `listCurrentClientTermsByProductIds`. Por cada línea:
        - disponible: `quantity = normalizeCartQuantity(cantidadVieja, terms)` (**sin** sumar lo que ya hay en el pedido; el diálogo muestra lo que se repite), con `lineTotal = calculateLineTotal(...)`;
        - no disponible: la cantidad vieja y `lineTotal: null`.
      - `quantityLabel` con `formatQuantity` y la unidad y presentación de hoy si está disponible, o las del snapshot si no.
    - `repeat(userId, { orderId, productIds })`, todo dentro de `db.$transaction`:
      - busca el pedido con `tx`;
      - aplica el gate: `orderPending` → `PRECONDITION_FAILED` con `REPEAT_ORDER_PENDING_MESSAGE`; `waitingOrder` → `PRECONDITION_FAILED` con `REPEAT_BLOCKED_MESSAGE`. **No** llama a `ensureCartMutable` antes del gate;
      - `collectRepeatLines` filtrado por `productIds`; si queda vacío, `BAD_REQUEST` con "Elegí al menos un producto del pedido.";
      - `addItemsInTransaction`.
      - Fuera de la transacción: `getCartSnapshot` y `parse`.
    - El pedido original solo se lee.
12. **`src/server/api/routers/orders.router.ts`**: `repeatPreview` (query) y `repeat` (mutación), los dos `protectedProcedure` con `.input`/`.output` de los schemas del paso 10. El `userId` sale siempre de `ctx.session.user.id`.
13. **Tests de servicio** en `src/server/services/cart/repeat-order.service.test.ts`, con mocks de `cart.data` y `checkout.data` al estilo de `checkout.delivery-refresh.test.ts`:
    - pedido de otro usuario → `NOT_FOUND`;
    - pedido "Pendiente" → `PRECONDITION_FAILED`, sin escrituras;
    - carrito `atCheckout` con pedido vivo:
      - el preview da `blocked` con código y monto;
      - `repeat` da `PRECONDITION_FAILED`;
      - **no se llama a `releaseCheckoutCart`, ni a `cancelTransaction`, ni a `updateOrderStatus`**;
    - carrito `atCheckout` sin pedido vivo → se libera y se suma;
    - solo se suman los `productIds` elegidos;
    - un producto sin términos vigentes da `unavailable` y no escribe;
    - un producto que ya está en el pedido se acumula y se ajusta (`updateCartItemQuantity` con la suma normalizada);
    - productos con términos nuevos (otro id que el del snapshot) se suman con el id vigente.

### 4.3. Cliente

14. **`src/store/cart-store.ts`**: acción `addItems: (items: CartItem[]) => void`, que hace `set((state) => ({ items: mergeCartItems(state.items, items) }))`. Comentario de una línea: "Additive, unlike `upsertItem`; for adding several products at once (combos)." No se usa en WP-G.
15. **`src/app/(storefront)/my-orders/[orderId]/_components/repeat-order-dialog.tsx`** (nuevo, `"use client"`). Props: `{ orderId: number; userId: string }`.
    - Botón `variant="outline"` con `RotateCcwIcon` y el texto "Repetir pedido". Abre un `Dialog` (`~/components/ui/dialog`).
    - Título "Repetir pedido". Descripción: "Usamos los precios y la disponibilidad de hoy. Lo que elijas se suma a tu pedido."
    - `api.orders.repeatPreview.useQuery({ orderId }, { enabled: open })`. Mientras carga, skeleton de 3 filas.
    - **`blocked`:** un `Alert` con "Tenés un pedido esperando el pago ({code}, {formatCurrency(total)}). Pagalo o volvé a editarlo antes de repetir otro." y un botón `Link` "Ver pedido pendiente" a `/my-orders/{id}`. Sin casillas ni "Sumar".
    - **`ready`:** una fila por línea, con:
      - `Checkbox` + `label` con el nombre;
      - debajo, `quantityLabel`;
      - a la derecha, `formatCurrency(lineTotal)` o "Ya no disponible".
      - La selección arranca con todos los `available`. Los no disponibles van `disabled`, sin marcar y en tono muted.
      - Si ninguno está disponible: "Ninguno de estos productos está disponible hoy." y el botón deshabilitado.
    - **Pie:** "Cancelar" y "Sumar a mi pedido", deshabilitado sin selección o mientras corre la mutación.
    - `api.orders.repeat.useMutation`:
      - `onSuccess`: `useCartStore.getState().replaceCart(output.cart, userId)`, toasts con `describeRepeatOutcome(output.lines)` y `router.push("/cart")`;
      - `onError`: `toast.error(error.message)`. Si es `PRECONDITION_FAILED`, `refetch()` del preview, que ahora muestra el aviso.
16. **`order-detail-view.tsx`**:
    - Nueva prop `actionsSlot?: React.ReactNode` (doc: "Real page only; the tutorial leaves it out.").
    - El `<section>` del título (`:138-145`) pasa a `flex flex-wrap items-end justify-between gap-3`, con el bloque actual a la izquierda y `{actionsSlot}` a la derecha. En mobile baja abajo del código de armado.
    - `:175-177`: `{itemQuantityLabel(item)}` → `{formatOrderLineQuantityPrice(item)}`. `itemQuantityLabel` sigue para `toOrderJourneyItemInputs`.
17. **`my-orders/[orderId]/page.tsx`**: `const session = await requireUser();`. Pasar `actionsSlot={canRepeatOrder(order.status) ? <RepeatOrderDialog orderId={order.id} userId={session.user.id} /> : null}`.

### 4.4. Companions

18. **Tutorial (ADR 0012):**
    - `order-detail-scene.tsx` no pasa `actionsSlot`. Queda igual, y hay que verificar que compila.
    - `tutorial-fixtures.ts:392-395`: agregar `productClientTerms: item.terms` al `priceSnapshot` de cada línea, para que la escena muestre "0,5 kg × $ 22.600 / kg" igual que la página real.
    - `tutorial-fixtures.test.ts`: assert de que `formatOrderLineQuantityPrice` sobre la primera línea de `orderDetail("shipping")` contiene "× " y "/ kg".
    - `tutorial-script.ts` no cambia, y los contadores tampoco.
19. **e2e, en `e2e/customer-tutorial.spec.ts`:** test "the order detail shows the price paid per unit and no repeat button":
    - `page.goto("/tutorial?version=rapido&paso=11")`;
    - `counter` "11 / 12";
    - `getByText(/0,5 kg × \$\s?22\.600 \/ kg/)` visible;
    - `getByRole("button", { name: "Repetir pedido" })` con `toHaveCount(0)`.
20. **`CONTEXT.md`**: entrada *Repeat order*, ya aplicada en el grill. Solo verificar.
21. **Vocabulario:** `grep -rni "carrito\|moq\|step\|máximo" ` sobre los archivos nuevos del cliente y sobre los mensajes del servicio no encuentra texto visible para el cliente.

## 5. Casos borde

- **El producto ya está en "Tu pedido" con los mismos términos:** se acumula y se ajusta. El toast dice "Ajustamos…" si la suma no cae justo.
- **El producto está en "Tu pedido" con términos viejos (cerrados) y hoy tiene otros:** se crea una línea nueva con los vigentes y la vieja queda. El checkout ya rechaza términos no usables (`checkout.service.ts:150`), así que no se cobra mal. Se acepta y no se trata aparte.
- **Repetir un pedido cancelado cuyo carrito es el actual.** Pasa después de "Volver a editar el pedido": el carrito vuelve a pendiente con los mismos productos. Repetirlo **duplica las cantidades**. Es la regla elegida (P2: sumar), y "Tu pedido" lo deja a la vista. Si QA lo marca, se reabre como mejora (ver §8).
- **Mismo producto dos veces en el pedido viejo:** una sola fila en el diálogo, con la cantidad sumada.
- **Snapshot viejo sin id de producto:** una fila "Ya no disponible".
- **Cantidad fija o tope menor que la cantidad vieja:** el diálogo ya muestra la cantidad ajustada y el precio de hoy.
- **Disponible en el diálogo pero no al confirmar** (carrera): la mutación lo informa como `unavailable` y aparece el toast "{name} ya no está disponible."
- **Checkout abierto sin pedido confirmado:** se libera como cualquier edición y no se avisa nada (no hay pago).
- **Pago en curso o transferencia informada:** es un pedido vivo, así que aplica el aviso de la P4. `ensureCartMutable` no llega a correr.
- **Pedido "Pendiente":** no tiene botón. Si alguien llama a la API, `PRECONDITION_FAILED`.
- **Tutorial:** el detalle muestra el precio por unidad y no tiene botón.

## 6. Aceptación

- `pnpm typecheck`, `pnpm test` y `pnpm check` en verde, con los tests nuevos de los pasos 1 a 6, 13, 18 y `cart-mappers`.
- Contra una DB local (§9 y §10 de la orquestación): `pnpm test:e2e e2e/customer-tutorial.spec.ts` en verde.
- **El flujo real no tiene e2e.** El login es solo con Google (`better-auth/config.ts`, `socialProviders.google`) y no se automatiza, con el mismo precedente que la invitación del tutorial (`customer-tutorial.md`). Lo cubren los tests de servicio del paso 13 y el Re-test de QA.
- Revisión manual con una cuenta de cliente:
  - detalle de un pedido "Completado" → "Repetir pedido" → diálogo con todas las casillas marcadas y los precios de hoy;
  - se desmarca una → "Sumar a mi pedido" → se abre `/cart` con las cantidades acumuladas;
  - el pedido original en "Mis pedidos" sigue igual;
  - las líneas del detalle muestran "cantidad × precio";
  - con una transferencia sin informar, el diálogo muestra el aviso y "Ver pedido pendiente", y el pedido pendiente sigue vivo con sus datos de pago;
  - un pedido "Pendiente" no muestra el botón.
- `/tutorial` no hace llamadas tRPC y no monta el diálogo. Los tests actuales del tutorial siguen en verde.
- Mini review: `q-review-code` (dos ejes) y `q-review-comments`.

## 7. Supuestos y coordinación

| Supuesto | Si no se cumple |
| --- | --- |
| "Esperando el pago" = el carrito actual está `atCheckout` y tiene un pedido vivo (`findLiveOrderByCartId`, estado distinto de cancelado y fallido). | Si aparecen pedidos "Pendiente" sin carrito actual (datos viejos), no bloquean. Solo se les oculta el botón. |
| El precio por unidad del detalle sale de `priceSnapshot.productClientTerms`, que el checkout guarda desde `buildPriceSnapshot` (`checkout.service.ts:209-221`). | Los pedidos sin ese dato muestran solo la cantidad, como hoy. |
| `findLiveOrderByCartId` y `findOrderByUserId` aceptan `tx` (`CheckoutDbClient` incluye `TransactionClient`). | Pasar `db` en el preview y `tx` en la mutación. |

**Archivos compartidos con otros WP:**
- `cart.service.ts` y `cart-store.ts` con **WP-D**. WP-G deja `addItems` y `addItemsInTransaction`, y WP-D les agrega el endpoint y el uso. Si WP-D se mergea antes, rebasear y reutilizar lo que haya, sin duplicarlo.
- `order-detail-view.tsx` con **WP-F**, que suma el descuento al "Resumen". WP-G toca el encabezado y las líneas de producto, no el "Resumen". Rebasear sin pisar.

## 8. Preguntas abiertas

Ninguna que bloquee. Queda un riesgo anotado para QA: repetir un pedido cancelado cuyos productos siguen en "Tu pedido" duplica las cantidades (§5).

## 9. Estado de QA al terminar

Cargar la transición en `scripts/qa-ticket-triage.data.ts` (WP0). La nota va **arriba**, sin borrar las anteriores.

- **#112 → Re-test.** Nota:
  > `[fecha · triage] Implementado en <commit>. Mirar: en Mis pedidos, detalle de un pedido que no esté "Pendiente" → "Repetir pedido"; diálogo con casillas (todas marcadas, precio de hoy, "Ya no disponible" deshabilitado); al confirmar se suma a Tu pedido (acumula si el producto ya estaba, ajustado al tamaño de compra) y se abre Tu pedido para editar y confirmar; el pedido original no cambia; cada línea del detalle muestra "cantidad × precio". Con otro pedido esperando el pago aparece el aviso con "Ver pedido pendiente" y no se cancela nada. Precondiciones: cuenta de cliente con al menos un pedido pagado; para el aviso, un pedido confirmado con transferencia sin informar.`

## 10. Hecho significa

- Los pasos 1 a 21 implementados en una rama de WP-G, con commits chicos.
- La aceptación de §6 en verde.
- La mini review aplicada.
- El merge `--no-ff` a `main`.
- El registro de ejecución agregado a este plan y una fila en §13 de la orquestación.
- La transición de §9 cargada en el script de triage.

## 11. Registro de ejecución

**13/11/2026 · implementador WP-G.** Rama `wpg-repeat-order` sobre `main` en `99c29f1`. Sin merge ni push.

### Commits

| Commit | Qué |
| --- | --- |
| `b0801e4` | `readSnapshotProduct`, `readSnapshotUnitPrice`, `canRepeatOrder` y `formatOrderLineQuantityPrice`, con tests (pasos 1 y 2). |
| `92eeda9` | `planCartAdditions`, `collectRepeatLines`, `decideRepeatGate`, `mergeCartItems`, `describeRepeatOutcome` y los schemas de `addItems`, con tests (pasos 3 a 6 y 8). |
| `2cf2a3e` | `listCurrentClientTermsByProductIds`, `addItemsInTransaction`, `addItems` y `readAddItemsOutput` (pasos 7 y 9). |
| `e1e14ea` | `repeat-order.schemas.ts`, `repeat-order.service.ts` y `orders.repeatPreview` / `orders.repeat` (pasos 10 a 12). |
| `7e4fdc9` | Tests del servicio con mocks de `cart.data` y `checkout.data` y un espía sobre `releaseCheckoutCart` (paso 13). |
| `cf13923` | Formato de Biome. |
| `8eb1812` | `addItems` del store, el diálogo "Repetir pedido", el slot del detalle, la línea "cantidad × precio" y la página (pasos 14 a 17). |
| `4d5c508` | Fixture del tutorial con `productClientTerms`, su test y el e2e (pasos 18 y 19). |
| `1b06b36` | Lo que dejó la mini review. |

### Validación

- `pnpm typecheck`: sin errores.
- `pnpm test`: 135 archivos pasan y 1 se saltea (`scripts/reset-initial-catalog.integration.test.ts`, que se saltea desde antes). Son 1970 tests en verde y 4 salteados.
- `pnpm check` (Biome): 871 archivos, sin cambios.
- **Pendiente de correr (no se corrió, por la DB compartida):** el e2e nuevo de `e2e/customer-tutorial.spec.ts`, "the order detail shows the price paid per unit and no repeat button", y el resto de ese archivo. Hay que correrlos contra una DB local (§9 y §10 de la orquestación).
- Paso 20: la entrada *Repeat order* de `CONTEXT.md` está y coincide con lo implementado.
- Paso 21: el grep de "carrito", "MOQ", "step" y "máximo" sobre el diálogo, los mensajes, el servicio y los schemas nuevos no encuentra nada.
- No hay migración: no cambia `prisma/schema.prisma`.

### Mini review

- **`q-review-code`, eje de estándares: pasa con hallazgos menores.**
  - Aplicado: el preview ahora decide el bloqueo con el veredicto de `decideRepeatGate` y no con la presencia del pedido vivo, así el gate es la única autoridad.
  - Riesgo residual: si los términos vigentes de un producto no tienen ni precio por unidad ni precio de mínimo, `calculateLineTotal` tira error y el preview responde 500. Es el mismo comportamiento que ya tienen el carrito y el checkout con esos términos, así que no se trató aparte.
  - El pedido se busca siempre con el `userId` de la sesión. Los `productIds` que no están en el pedido se ignoran, así que la mutación no sirve para sumar productos arbitrarios.
- **`q-review-code`, eje de especificación: pasa.** Los pasos 1 a 21 están cubiertos y los desvíos están abajo.
- **`q-review-comments`: pasa con hallazgos, ya aplicados.**
  - Se reescribió el comentario del estado de selección del diálogo, que era ambiguo (blocker).
  - Se acortó el docstring de `addItemsInTransaction`, que repetía el de `planCartAdditions` (sugerencia).

### Desvíos

1. **`readAddItemsOutput` y `findCurrentTermsByProductId` exportadas desde `cart.service.ts`.**
   - El plan pide que `repeat` lea el carrito fuera de la transacción, pero `getCartSnapshot` es privada.
   - En vez de exportarla tal cual, `readAddItemsOutput` arma y valida la salida de `addItems`. La usan `addItems` y `repeat`.
   - `findCurrentTermsByProductId` se queda con los términos vigentes de cada producto y la comparten el preview y `addItemsInTransaction`.
2. **`CartTransaction` exportado.** Es un alias del tipo de cliente de transacción que `cart.service.ts` ya repetía en línea. Solo lo usan las funciones nuevas: las existentes no se tocaron.
3. **Tipos de "Repetir pedido" en `cart.types.ts`** (`RepeatOrderPreview`, `RepeatOrderPreviewLine`, `RepeatOrderInput`). El plan no decía dónde iban.
4. **`quantity` de `cartAddedLineSchema`** usa `decimalOutputSchema.nullable()` en lugar de `z.string().nullable()`, como el resto de las cantidades del carrito. La salida es la misma.
5. **El diálogo, además de `replaceCart`, invalida `cart.getCurrent`** para que la caché de tRPC no quede atrás del store al llegar a `/cart`.
6. **Pedido de otro usuario en `repeat` y producto elegido que no está en el pedido.** El plan solo pedía el `NOT_FOUND` del preview. Se agregó un test de que `repeat` también da `NOT_FOUND` y otro de que elegir solo productos ajenos al pedido da `BAD_REQUEST` sin escribir.
7. **El e2e usa `.first()`** en el `getByText` del precio, por si la escena muestra el texto más de una vez.
8. **§9 y §10 sin cerrar en este WP.**
   - `scripts/qa-ticket-triage.data.ts` todavía no existe porque WP0 no se mergeó. La transición de #112 queda escrita abajo para que el orquestador la cargue cuando exista.
   - La fila de §13 de la orquestación la agrega el orquestador con el merge.

### Nota de QA para #112 (transición a Re-test)

Va **arriba** de las notas que haya, sin borrarlas, por `scripts/qa-ticket-triage.data.ts` cuando WP0 esté mergeado. Hay que reemplazar `<commit>` por el merge a `main`.

> `[13/11/2026 · triage] Implementado en <commit>. Mirar: en Mis pedidos, detalle de un pedido que no esté "Pendiente" → "Repetir pedido"; diálogo con casillas (todas marcadas, precio de hoy, "Ya no disponible" deshabilitado); al confirmar se suma a Tu pedido (acumula si el producto ya estaba, ajustado al tamaño de compra) y se abre Tu pedido para editar y confirmar; el pedido original no cambia; cada línea del detalle muestra "cantidad × precio". Con otro pedido esperando el pago aparece el aviso con "Ver pedido pendiente" y no se cancela nada. Precondiciones: cuenta de cliente con al menos un pedido pagado; para el aviso, un pedido confirmado con transferencia sin informar.`

### Riesgo anotado para QA

- Repetir un pedido cancelado cuyos productos siguen en "Tu pedido" duplica las cantidades (§5). Es la regla elegida en la P2.
- Los pedidos de antes de que el checkout guardara `productClientTerms` en `priceSnapshot` muestran solo la cantidad, sin "× precio".
