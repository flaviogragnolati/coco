# Plan: WP-A — bug y ajustes rápidos (#93, #97, #107 parcial, #109, #103 y #92 en código)

> **Estado:** implementado el 2026-11-13 en la rama `wpa-quick-fixes` (base `a0ef619`). Sin merge ni push. Falta la revisión independiente (§4 de la orquestación) y correr los e2e contra una base local.
> **Fuente:** `docs/plans/qa-open-tickets-2026-11-orchestration.md` §6 WP-A y `docs/plans/qa-open-tickets-2026-11-report.md`. Esos dos documentos todavía no están commiteados en `main`; se leyeron del checkout principal.

## 1. Objetivo

Cerrar en código el bug #93 y los ajustes chicos que no necesitan grill: la ficha del producto (#97 y la parte de #107 que no depende del cierre semanal), los similares por categoría (#107), la marca "CoCo" (#109), el catálogo sin filtro de unidad (#103) y la parte de código de #92. Las decisiones ya estaban tomadas en §2 y §6 de la orquestación.

**Fuera de alcance:** la línea de cierre del subtítulo y la imagen 1:1 de la ficha (WP-B y WP-C), el contenido de las descripciones (WP-I) y el wordmark en minúscula "coco".

## 2. Pasos

| Ticket | Commit | Qué se hizo |
| --- | --- | --- |
| #93 | `5a550a1` | Componente nuevo `HashSafeLink` (`src/components/hash-safe-link.tsx`). Los href con `#` se renderizan como `<a>` nativo y el resto como `<Link>`. Se usa en el CTA del hero, el menú mobile, el menú de ayuda (`/#preguntas-frecuentes` y `/#contacto`), los links del pie, "Contactar a CoCo" de ofertas y "Escribinos." del detalle del pedido. El id `ofertas` no cambia. |
| #97 + #107 parcial | `10000bf` | En `product-details-dialog.tsx`: sale "Sin galería adicional"; la descripción se oculta si falta o si solo repite el nombre (helper `visibleProductDescription` en `src/shared/common/product-description.ts`, que ignora el punto final, las mayúsculas y los espacios); sale el botón "Cerrar" del pie; el subtítulo genérico queda como `DialogDescription` sr-only. En `dialog.tsx`, el label de la ✕ y el botón opcional del pie pasan de "Close" a "Cerrar" en todos los diálogos. |
| #107 similares | `8d6520b` | `selectSimilarProducts`: primero la misma categoría, después la misma marca y después la misma unidad. Dentro de cada grupo van primero los productos cuyo nombre comparte más palabras con el actual y después los de precio más cercano. `CONTEXT.md` (*Similar product*) quedó actualizado y "category" salió de `_Avoid_`. |
| #109 | `b4cd7f7` | "Coco" → "CoCo" en los títulos y la metadata (incluido "CoCo \| Compras comunitarias en Ushuaia"), el pie ("© 2026 CoCo"), los pasos del home, la ilustración, el login, el menú mobile, la página de proveedores, el tutorial (guion, invitación y fixture de términos), el admin (layout, inicio, sidebar), el glosario, el `appName` de Better Auth y el texto del ticket de QA del seed que cita la invitación. **No cambiaron:** el wordmark "coco" (navbar, h1 del hero, pie, ilustración, navbar del tutorial), `contacto@coco.app`, los identificadores, "Coco rallado fino" (es un producto), la prosa de `docs/` y los datos de prueba de los tests (marcas y titulares inventados). |
| #103 | `bdeff04` | Sale el bloque "Unidad" del sidebar, su chip de filtro activo, `units` de `CatalogFilters`, `computeUnitFacets`, `CatalogUnitFacet` y `setUnits`. Un link viejo con `?unit=kg` se ignora y muestra todo el catálogo; "Limpiar" sigue borrando ese parámetro. La escena del catálogo del tutorial dejó de pasar las facetas de unidad. |
| #92 código | `86771bf` | La línea del pedido (`cart-line-row.tsx`) ya no muestra el texto de relleno "Producto agregado para compra mayorista compartida.": usa la misma regla que la ficha. Tests nuevos del vaciado de la descripción en el admin (`product.data.test.ts` y un caso en `product.service.test.ts`). |

## 3. Causa de #93

**Confirmada en una reproducción aislada, con confianza alta en el mecanismo de la duplicación. El "se traba" no se reprodujo.**

- **Mecanismo (Next 16.2.7, `node_modules/next/dist/client/components/segment-cache/navigation.js`):**
  - Cuando el `<Link>` navega a una ruta que **no estaba prefetcheada** (`navigateToUnknownRoute`), `fetchServerResponse` devuelve como `canonicalUrl` la URL pedida **con el hash** (`fetch-server-response.js:114`, `canonicalUrl = res.redirected ? responseUrl : originalUrl`).
  - Ese valor se guarda en la caché de rutas con `discoverKnownRoute(..., createHrefFromUrl(canonicalUrl))`, y `createHrefFromUrl` incluye el hash por defecto (`navigation.js:230`).
  - En el clic siguiente a esa ruta, `navigateUsingPrefetchedRouteTree` arma `route.canonicalUrl + url.hash` (`navigation.js:156`): `"/#ofertas" + "#ofertas"` = `"/#ofertas#ofertas"`.
  - El mismo estado hace que el logo (`<Link href="/">`) lleve a `/#ofertas`.
  - El prefetch, en cambio, guarda la URL sin hash (`cache.js:1003`, `pathname + search`). Por eso, entrando directo a `/`, no pasa.
- **Reproducción aislada (sin base):** una app mínima de Next 16.2.7 en el scratchpad con una página dinámica, `<Link href="#ofertas">`, `<Link href="/#ofertas">` y una sección `id="ofertas"`, manejada con Chromium de Playwright fuera del proyecto.
  - Entrando directo a `/` y haciendo 3 clics: la URL queda en `/#ofertas`, tanto en `next start` como en `next dev`.
  - Llegando desde otra página por un `<Link>` con hash sin prefetch (en `next dev` nunca hay prefetch), los clics siguientes en el CTA o en el link del navbar dan `/#ofertas#ofertas`, y el logo lleva a `/#ofertas`.
  - **Con el fix** (`<a>` nativo, tanto para llegar como en el CTA): 3 clics dan `/#ofertas` y el logo vuelve a `/`.
- **En la app:** las vías de entrada son los `<Link>` con hash fuera del home: el menú de ayuda (`/#preguntas-frecuentes` y `/#contacto`, en todas las páginas y también en desktop), el menú mobile (`/#ofertas`, etc.) y "Escribinos." del detalle del pedido.
- **Sin confirmar:**
  - el triple `#ofertas#ofertas#ofertas` del ticket. En la reproducción la URL se quedó en dos; `router.refresh()` no lo hizo crecer.
  - el bloqueo de la página. Hipótesis: con prefetch, cada clic repetido en la misma URL dispara un refresco dinámico de la página entera (`isSamePageNavigation`; se vio un request RSC por cada clic repetido). En el home real eso vuelve a correr `getSession` y `getHomeContent` en cada clic. Con `<a>` nativo no hay requests.
- **Fix elegido:** el `<a>` nativo. El navegador hace el scroll dentro de la página y respeta `scroll-mt-20`. Desde otra página carga `/#...` completo, así que la caché del router no queda con el hash.
  - **Costo:** ir de `/products` a "Ofertas" o "Preguntas frecuentes" recarga la página, en vez de navegar en el cliente.
  - Conviene revisarlo cuando se actualice Next: si el router deja de guardar el hash, `HashSafeLink` se puede volver a `<Link>`.

## 4. Validación

| Comando | Resultado |
| --- | --- |
| `pnpm typecheck` | Sin errores (`tsgo --noEmit`). |
| `pnpm test` | 132 archivos pasan y 1 se saltea; 1931 tests pasan y 4 se saltean. |
| `pnpm check` | `biome check .`: 865 archivos, sin cambios ni errores. |
| `grep -rn '"Coco\|Coco ' src` | Quedan 3 resultados, todos datos de prueba que no se ven: `cart-mappers.test.ts:21` y `home-formatters.test.ts:31` (marca de prueba) y `checkout.delivery-refresh.test.ts:174` (titular de prueba). `grep -rnw Coco` suma un comentario en `home-formatters.ts:128`. Revisado a mano: no queda ningún "Coco" visible. |

**#92, prueba que tenía que fallar primero:** los tests nuevos **pasan sin tocar código**. `nullishText` convierte "" en `undefined`, pero `updateProduct` (`product.data.ts:226`) escribe `description: input.description ?? null`. Una descripción vaciada desde el admin se guarda como `null`. El bug lateral del triage no existe en el código actual: el reporte leyó `toProductWriteInput` sin mirar la capa de datos. Los tests quedan como guarda de regresión.

## 5. e2e escritos o ajustados, pendientes de correr contra la base local

**No se corrieron:** no hay base local y el `.env` apunta a la base compartida.

- `e2e/home-section-links.spec.ts` (nuevo):
  - 3 clics en "Ver qué se puede comprar" y una sola `#ofertas` en la URL;
  - en mobile, desde `/products`: menú → "Ofertas", después 3 clics en el CTA con una sola `#ofertas`, y el logo vuelve a `/`.
- `e2e/catalog-product-card.spec.ts` (test nuevo): la ficha no muestra "Sin galería adicional" ni la descripción de relleno, el subtítulo genérico no está visible y tiene un solo botón "Cerrar" (la ✕).
- `e2e/catalog-category-filter.spec.ts` (test nuevo): `/products?unit=kg` muestra el mismo total que `/products` y no aparece "Unidad".
- `e2e/smoke.spec.ts` ("Explorá CoCo" y la ilustración con "CoCo junta los pedidos") y `e2e/supplier-application.spec.ts` ("Sé proveedor de CoCo"). **Ojo:** `supplier-application.spec.ts` escribe en la base. Corre solo contra la base local.
- Los tests que cierran la ficha con `getByRole("button", { name: "Cerrar" }).last()` (`smoke`, `catalog-product-card` y `home-offer-quantity`) ahora apuntan a la ✕, que se llama "Cerrar". Hay que confirmar que sigan en verde.

## 6. Qué tiene que mirar QA

- **#93:**
  - En el home, tocar "Ver qué se puede comprar" varias veces: baja a Ofertas y la URL queda con un solo `#ofertas`.
  - Repetirlo después de llegar desde el catálogo con el menú (mobile: ☰ → "Ofertas"; desktop: (?) → "Preguntas frecuentes") y tocar el logo: vuelve a `/` sin hash.
  - Tener en cuenta que, desde otra página, esos links ahora recargan la página.
- **#97:** abrir un producto con una sola imagen (por ejemplo, Aceite de oliva extra virgen 0,5 L): no aparece "Sin galería adicional" ni queda el hueco. Con varias imágenes, la galería funciona igual.
- **#107** (sigue en Pendiente hasta WP-B y WP-C):
  - la descripción que solo repite el nombre no se muestra;
  - hay un solo control para cerrar (la ✕, más Esc y tocar afuera);
  - los similares del aceite son primero los otros aceites. El tercer lugar puede ser la sal rosada o la pasta de maní: comparten la categoría "Aceites y despensa".
- **#109:**
  - la pestaña dice "CoCo | Compras comunitarias en Ushuaia" y el pie "© 2026 CoCo";
  - "CoCo" en el login, los pasos del home, el menú mobile ("Explorá CoCo"), proveedores, el tutorial y el admin;
  - el logo sigue en minúscula.
- **#103:** en `/products` el sidebar ya no tiene "Unidad". Un link viejo con `?unit=kg` muestra todo el catálogo.
- **#92** (sigue en Pendiente hasta WP-I): en Tu pedido, una línea sin descripción propia ya no muestra el texto de relleno. Vaciar la descripción de un producto en el admin y guardar la deja vacía.

## 7. Desvíos y decisiones

- **#107, orden de los similares.** §6 pedía "misma categoría primero y después el criterio actual". Con solo eso, el aceite de 0,5 L proponía sal rosada, pasta de maní y aceite de 1 L, por cercanía de precio. Seguía mostrando lo que el ticket objeta y contradecía §2 ("los otros tamaños aparecen como similares por categoría"). Por eso se sumó, dentro de cada grupo, el orden por palabras del nombre en común antes del precio.
- **#93, alcance.** Además del CTA y del navbar se cambiaron los otros `<Link>` con hash: menú de ayuda, pie, "Contactar a CoCo" y "Escribinos.". Son las mismas vías de entrada al bug.
- **#92, bug del admin.** No se reprodujo (§4). No se cambió código del admin. Queda el test como guarda.
- **#109, texto del ticket de QA.** Se actualizó `scripts/qa-tickets.data.ts`: el texto que cita la invitación del tutorial pasa a decir "¿Primera vez en CoCo?". Lo ve el admin cuando corre `qa:seed`.
- **Vista previa del admin.** `product-preview-dialog.tsx` conserva "Producto sin descripción configurada en el catálogo.": es un aviso para el admin, no un texto para el cliente.

## 8. Revisión

La mini review (`q-review-code` en sus dos ejes y `q-review-comments`) **no se corrió dentro del paquete**. §4 de la orquestación la asigna a un revisor nuevo, que no sea el implementador. Queda pendiente para el orquestador. El implementador releyó el diff y los comentarios nuevos (`HashSafeLink`, `visibleProductDescription`, `selectSimilarProducts` y el parámetro `unit` retirado).

## 9. Estado de QA al terminar (lo aplica WP1)

- #93, #97, #103 y #109 → **Re-test**.
- #107 y #92 → siguen en **Pendiente** (WP-B, WP-C y WP-I).
