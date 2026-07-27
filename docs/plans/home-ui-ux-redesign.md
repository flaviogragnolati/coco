# Implementation Plan: Rediseño UI/UX del Home y Piloto de Paleta

## 1. Objective & outcome

- **Done means:** `/` comunica con claridad qué es Coco, cómo se compra y qué ocurre
  después del pago; presenta una oferta protagonista y hasta cuatro ofertas destacadas
  vigentes; conduce al producto exacto en `/products?product=<id>`; incluye preguntas
  frecuentes, contacto y navegación responsive; y utiliza una nueva base cromática
  reutilizable con teal, tinta, marfil, aqua/menta y ámbar/coral sin convertir toda la
  aplicación en parte de este rollout.
- **Why:** El home actual ya contiene muchas de las piezas solicitadas, pero repite
  conceptos en seis secciones, dirige los CTAs a login o pedidos en lugar de iniciar una
  compra, describe el orden pago/consolidación de forma incorrecta y depende casi por
  completo de superficies blancas y grises.
- **For:** AI coding agent / developer.
- **Upstream design doc:** none. No existe un documento `design-grill` para el home; el
  trabajo sigue siendo una feature autocontenida con un pequeño piloto transversal de
  tokens y navegación.

## 2. Alignment reached

| Topic | Decision | Source |
| --- | --- | --- |
| Conversión principal | Comprar es la conversión primaria; registrarse es secundaria. El CTA principal del hero siempre lleva a `/products`. | user |
| Acceso previo al registro | Cualquier visitante puede explorar y armar el carrito; la autenticación se exige al iniciar checkout. | user + code (`CartSheet`) |
| Estructura | Hero → Cómo funciona → Ofertas destacadas → Preguntas frecuentes → Contacto → Footer. | user |
| Secciones eliminadas | “Unirse” y “Destacados” dejan de existir como secciones independientes; sus beneficios útiles se integran en hero/flujo/CTA. | user |
| Preguntas frecuentes | Sección propia de seis acordeones, enlazada desde Cómo funciona, navbar y footer. | user |
| Oferta destacada | Es un producto vigente seleccionado automáticamente por sus Client terms; no implica promoción, descuento ni Operation abierta. | user + code + `CONTEXT.md` |
| Selección de ofertas | Mantener la selección automática de hasta cuatro condiciones vigentes más recientes; sin panel de curaduría. | user + code |
| Flujo comunicado | 1) explorar y armar pedido, 2) registrarse/elegir entrega/pagar, 3) Coco consolida demanda pagada y comunica avance hasta entrega. | user + checkout/operations code |
| Demanda reprogramada | Si la demanda pagada no entra en una operación, puede reprogramarse; se muestra en Mis pedidos y soporte atiende casos particulares. No prometer plazo ni reintegro automático. | user + operations/tracking code |
| Hero | Composición split con alto uso de marca y primera oferta vigente como protagonista; fallback gráfico de marca si no hay oferta o imagen. | user |
| CTA de oferta | “Ver producto” abre el producto exacto mediante `/products?product=<id>`; no fuerza login ni agrega directamente desde el home. | user |
| Tarjeta de oferta | `HomeOfferCard` específica, presentacional y server-compatible; reutiliza primitivas, imagen y helpers, no el `ProductCard` interactivo. | user + code |
| Información de oferta | Imagen, marca, nombre, precio del bloque mínimo, referencia por unidad cuando exista, cantidad mínima y CTA. Sin descuentos ni contadores. | user |
| Estado sin ofertas | Mantener sección/anclas con estado vacío de marca y CTA a Contacto; hero pasa a fallback genérico. | user |
| Contacto público | WhatsApp + email, sin formulario. Mantener temporalmente los valores mock actuales. | user |
| Formulario de contacto | Feature futura, separada y visible solo para usuarios autenticados; fuera de este rediseño. | user |
| Navegación | Marca sin botón “Home” redundante, anclas públicas, CTA Comprar, carrito, sesión/admin y menú mobile. | user |
| Paleta | Mantener teal como primary; sumar tinta, marfil, aqua/menta y ámbar/coral; usar color sobre todo en superficies amplias y jerarquía. | user |
| Alcance cromático | Crear base global y variantes reutilizables; aplicar el rollout completo solo al home y navbar en este trabajo. | user |
| Composición visual | Reducir el “mosaico de tarjetas”: secciones tintadas, flujo conectado, cards reservadas para producto/FAQ, contacto en una franja y sombras sutiles. | user |
| Voz | Voseo rioplatense directo, con tildes correctas; explicar “cantidad mínima” en lugar de exponer “MOQ” cuando no sea necesario. | user |

## 3. Scope

- **In scope:**
  - Recomposición completa de `/` con las cinco secciones acordadas y footer.
  - Nuevo sistema de color base: retoque leve de neutros globales, tokens de superficie
    de marca y variante de highlight para primitivas que la requieran.
  - Hero dinámico con oferta protagonista y fallback gráfico.
  - Paso a paso real de tres etapas, sin invertir pago y consolidación.
  - Listado automático de hasta cuatro `Featured offer`, con tarjeta específica.
  - Deep link estable a detalle de producto por query param `product`.
  - FAQ accesible basada en Radix Accordion.
  - Contacto público por email/WhatsApp mock y CTA adaptado al estado de sesión.
  - Navbar público responsive con anclas absolutas `/#...`.
  - Extracción de `ProductImage` y de la lógica de precio unitario para reutilización.
  - Eliminación de consultas, schemas, tipos y componentes exclusivos de las secciones
    “Unirse” y “Destacados”.
  - Tests puros de precio y pruebas E2E del home/deep link/mobile nav.
- **Out of scope / non-goals:**
  - Formulario de contacto, almacenamiento de consultas, anti-spam o bandeja admin.
  - Promociones reales, descuentos, countdowns, progreso de una compra grupal o selección
    editorial desde administración.
  - Cambios en checkout, pagos, reembolsos, operaciones, rollovers o tracking.
  - Reescritura visual de catálogo, carrito, checkout, pedidos o administración.
  - Dark-mode toggle; solo se mantiene paridad de tokens `.dark`.
  - CMS, edición de contenido desde administración, analytics o experimentación A/B.
  - Nuevas imágenes cargadas al repositorio o un pipeline de media.
- **Deferred:**
  - Formulario autenticado de contacto.
  - Reemplazo de email/WhatsApp mock por canales definitivos.
  - Rollout de la paleta/variantes sobre el resto de las rutas.
  - Ofertas curadas o promocionales con modelo y administración propios.
  - Analítica de conversiones del hero, ofertas y registro.
- **Must not change / break:**
  - El contrato y comportamiento del carrito, mini-cart, autenticación y checkout.
  - Los filtros/query params actuales del catálogo (`q`, `brand`, `unit`, `min`, `max`,
    `inCart`, `sort`, `view`, `page`, `perPage`).
  - El dropdown y los permisos admin del navbar.
  - La fuente de precio: Client terms; no recalcular importes con reglas nuevas.
  - El resto de los consumidores de `Card`, `Button`, `Badge` y `ProductImage`.

## 4. Current system context

- `src/app/page.tsx` obtiene sesión, `getHomeOffers()` y
  `getHomeFeaturedProducts()`; renderiza Hero, Cómo funciona, Unirse, Ofertas,
  Destacados, Contacto y Footer. Las dos últimas consultas de producto se solapan.
- `src/features/home/_components/home-hero.tsx` ya usa `offers[0]`, pero el CTA anónimo
  fuerza `/login`, el CTA autenticado va a `/my-orders` y el fondo vuelve la imagen casi
  invisible mediante `bg-background/85`.
- `src/features/home/_components/how-it-works-section.tsx` muestra cuatro cards y no
  declara `id="como-funciona"`, aunque el hero enlaza a esa ancla.
- `src/features/home/_components/join-section.tsx` y
  `src/features/home/_components/featured-section.tsx` repiten registro, beneficios y
  productos que ya aparecen en el resto del home.
- `src/features/home/_components/current-offers-section.tsx` define `OfferCard`
  localmente. Sus CTAs van a login/mis pedidos y el precio usa
  `refPrice ?? moqPrice`, por lo que no mantiene la jerarquía “bloque mínimo primero”.
- `src/features/home/home-content.ts` concentra navegación y copy, pero aún conserva
  pasos/beneficios de las secciones que serán eliminadas y datos mock de contacto.
- `src/server/services/home/home.data.ts` lista Client terms vigentes ordenados por
  `fromDate`, `updatedAt` e `id`; la relación ya selecciona `product.id`, por lo que el
  deep link no necesita una nueva consulta ni migración.
- `src/schemas/home.schemas.ts` modela `HomeOffer.id` como el id de
  `ProductClientTerms`, no como producto; además mantiene un modelo completo de featured
  products que dejará de consumirse.
- `src/app/products/_components/products-client.tsx` controla el detalle mediante
  `selectedProductId` local. `src/app/products/_components/use-catalog-params.ts` ya
  centraliza el resto del estado URL y es el punto correcto para sumar `product`.
- `src/app/products/_components/product-card.tsx` es un Client Component fuertemente
  interactivo: requiere carrito, siete callbacks, stepper y detalle. No es una base
  adecuada para el home.
- `src/app/products/_components/product-image.tsx` sí es presentacional y ya lo reutiliza
  `src/features/admin/crud/product/product-preview-dialog.tsx`, pese a vivir bajo una
  ruta de página; debe moverse a una ubicación compartida.
- `src/app/products/_components/product-price-block.tsx` contiene un
  `getPerUnitPrice()` correcto pero privado. La lógica pertenece a
  `src/shared/common/commerce.helpers.ts`, donde ya viven precio, cantidad y selección
  de imagen.
- `src/styles/globals.css` tiene primary teal y tokens `success`, `warning`, `info`, pero
  `background`, `card`, `secondary`, `muted` y `accent` siguen siendo blancos/grises.
  `Button` y `Badge` ya consumen tokens; no deben recibir colores hex/OKLCH inline.
- `src/components/app-navbar.tsx` es sticky pero sin `z-index`, duplica marca + “Home”,
  no muestra anclas y usa `flex-wrap` como solución mobile. `src/components/ui/sheet.tsx`
  ya existe y permite un menú mobile sin nueva dependencia.
- No existe `Accordion` en `src/components/ui`; el paquete unificado `radix-ui@1.4.3`
  sí exporta `Accordion`.
- El flujo verificado en código es: `checkout.confirmAndPay()` crea orden/intento;
  tras pago aprobado, items pasan a `submitted/awaitingAggregation`; las Operations
  toman demanda con transacción completada y pueden materializar Roll overs.
- Las pruebas usan Vitest para helpers puros y Playwright para smoke; no hay React Testing
  Library ni Storybook.

## 5. Approach & sequencing

Se seguirá un enfoque **foundation-first, data-contract-first y reemplazo atómico del
home**:

1. Crear primero tokens, variantes, Accordion y piezas de presentación compartidas.
2. Corregir el read model de ofertas y hacer URL-addressable el detalle del catálogo.
3. Construir cada sección nueva sobre contratos ya estables.
4. Reordenar `page.tsx`, retirar código muerto y luego migrar el navbar.
5. Validar helpers, deep links, responsive, estados de datos y regresiones globales.

El orden evita diseñar componentes contra el `HomeOffer` ambiguo actual y evita que los
CTAs del nuevo home lleguen a una URL que todavía no abre el producto. Los cambios a
primitivas son aditivos; el retintado de tokens globales se mantiene deliberadamente
leve y se acompaña con un smoke visual de rutas no-home.

## 6. Assumptions

| Assumption | Why reasonable | What invalidates it | What to do if false |
| --- | --- | --- | --- |
| La primera Client terms vigente es una protagonista válida. | El usuario aceptó selección automática y el servicio ya ordena por vigencia reciente. | Producto que no debe aparecer en hero. | Introducir una regla/flag de curaduría como feature posterior; no inferirlo en este plan. |
| Puede existir más de una oferta vigente por producto solo excepcionalmente. | `currentTermsWhere` representa el contrato de disponibilidad actual. | Se muestran cards duplicadas del mismo producto. | Deduplicar por `product.id` en la consulta/servicio manteniendo el registro más reciente. |
| Los visitantes pueden usar catálogo y carrito sin sesión. | El catálogo es público y el mini-cart guarda localmente; login se exige para checkout. | Guard de ruta nuevo en `/products`. | Mantener CTA `/products`, pero ajustar copy y callback de login según el guard real. |
| `product` es un query param libre que no colisiona con filtros existentes. | No aparece entre los params actuales de `useCatalogParams`. | Otro consumidor ya lo usa. | Renombrar a `productId` de forma consistente en home, hook y tests. |
| Los valores mock de contacto son aceptables durante desarrollo. | Decisión explícita del usuario. | Release a usuarios reales. | Reemplazarlos antes de producción; es condición de rollout, no de implementación local. |
| El home puede usar fallbacks sin imágenes. | Los datos actuales contienen productos sin `imageUrl`. | Diseño exige fotografía obligatoria. | Bloquear publicación de ofertas sin imagen o cargar assets en una feature de media separada. |
| El ajuste cromático global puede ser leve sin rediseñar otras páginas. | Se retintan tokens existentes y las variantes nuevas son aditivas. | Contraste o legibilidad empeoran en rutas no-home. | Revertir el retintado de base y conservar solo los nuevos tokens de superficie para adopción explícita. |

## 7. Phased execution plan

### Phase 1 — Fundación visual y de presentación

**Objective:** Crear tokens, variantes y piezas compartidas sin cambiar todavía la
composición del home.

**Tasks:** T1, T2, T3.

**Dependencies:** none.

**Validation / done:** Las utilities de color resuelven en light/dark; Accordion funciona
con teclado; catálogo y preview admin compilan usando el `ProductImage` compartido; tests
de precio unitario pasan.

### Phase 2 — Contratos de oferta y continuidad hacia catálogo

**Objective:** Volver inequívoco el id de producto y permitir que cualquier oferta abra
su detalle por URL.

**Tasks:** T4, T5.

**Dependencies:** T3 para helpers compartidos.

**Validation / done:** `getHomeOffers()` devuelve ids explícitos y no hace la consulta
de featured products; navegar a `/products?product=<id>` abre el diálogo correcto y
cerrarlo limpia solo ese param.

### Phase 3 — Nuevo home

**Objective:** Implementar hero, flujo, ofertas, FAQ, contacto y footer con el sistema
visual acordado.

**Tasks:** T6, T7, T8, T9, T10, T11, T12.

**Dependencies:** Phases 1–2.

**Validation / done:** La página contiene exactamente la estructura acordada, todos los
CTAs son correctos por estado de sesión, las anclas funcionan y los estados con/sin
ofertas no rompen layout.

### Phase 4 — Navegación pública responsive

**Objective:** Alinear el navbar global con la conversión y estructura del home sin
perder sesión, carrito ni administración.

**Tasks:** T13.

**Dependencies:** T6 (links/ids definitivos), `Sheet` existente.

**Validation / done:** Desktop y mobile exponen las rutas acordadas; los enlaces de ancla
funcionan desde cualquier ruta; admin y user menu mantienen permisos/acciones.

### Phase 5 — Pruebas, accesibilidad y pulido

**Objective:** Cerrar regresiones de contenido, URL, responsive, contraste y movimiento.

**Tasks:** T14, T15.

**Dependencies:** Phases 1–4.

**Validation / done:** Test, typecheck, Biome, build y E2E verdes; revisión manual en
360/768/1440 px y smoke de rutas no-home completados.

## 8. Task breakdown

### T1 — Establecer tokens de marca y variantes de highlight

- **Files:** `src/styles/globals.css`, `src/components/ui/button.tsx`,
  `src/components/ui/badge.tsx`
- **Symbols / signatures:** pares de tokens `--brand-soft/-foreground`,
  `--brand-warm/-foreground`, `--brand-ink/-foreground`,
  `--highlight/-foreground` en `:root` y `.dark`; mappings `--color-*` en
  `@theme inline`; variantes `highlight` en `buttonVariants` y `badgeVariants`.
- **Change (operational, not finished code):**
  - Conservar el hue teal de `--primary`.
  - Retintar de forma leve `--background`, `--secondary`, `--muted`, `--accent`,
    `--border` y `--ring` para salir del blanco/gris puro sin cambiar sus roles.
  - Crear superficies de marca aqua/menta, marfil cálido, tinta de alto contraste y
    highlight ámbar/coral con foregrounds explícitos.
  - Agregar utilities Tailwind para todos los nuevos tokens.
  - Agregar variantes aditivas `highlight`; no reutilizar `warning` como decoración.
- **Mirror this pattern:** bloques light/dark y mappings actuales en
  `src/styles/globals.css`; variantes `success/warning/info` de
  `src/components/ui/badge.tsx`.
- **Depends on:** none.
- **Acceptance:** `bg-brand-soft`, `bg-brand-warm`, `bg-brand-ink`, `bg-highlight` y sus
  foregrounds compilan; botones/badges `highlight` tienen contraste legible; variantes
  existentes mantienen contrato y forma.
- **Pitfalls:** Cada token necesita mapping `@theme inline`; no usar `warning` para una
  oferta normal; el retintado base afecta todas las rutas y debe permanecer sutil.

### T2 — Agregar Accordion accesible

- **Files:** `src/components/ui/accordion.tsx` `[NEW]`
- **Symbols / signatures:** `Accordion`, `AccordionItem`, `AccordionTrigger`,
  `AccordionContent`.
- **Change (operational, not finished code):** Implementar el primitive shadcn-style con
  `Accordion as AccordionPrimitive` desde `radix-ui`, `ChevronDownIcon`, `cn`,
  `data-slot`, animaciones existentes y estilos basados exclusivamente en tokens.
- **Mirror this pattern:** `src/components/ui/tabs.tsx` y convenciones de
  `src/components/ui/sheet.tsx`.
- **Depends on:** T1 para superficies nuevas, aunque puede compilar con tokens base.
- **Acceptance:** `type="single" collapsible` abre/cierra; Enter/Space y flechas funcionan
  según Radix; trigger expone foco visible y estado; contenido respeta reduced motion.
- **Pitfalls:** `radix-ui` ya exporta Accordion; no instalar otra dependencia ni envolver
  triggers en botones adicionales.

### T3 — Compartir imagen de producto y cálculo de referencia unitaria

- **Files:** `src/features/catalog/_components/product-image.tsx` `[NEW]`,
  `src/app/products/_components/product-image.tsx` (delete),
  `src/app/products/_components/product-card.tsx`,
  `src/app/products/_components/product-details-dialog.tsx`,
  `src/app/products/_components/catalog-table.tsx`,
  `src/features/admin/crud/product/product-preview-dialog.tsx`,
  `src/app/products/_components/product-price-block.tsx`,
  `src/shared/common/commerce.helpers.ts`,
  `src/shared/common/commerce.helpers.test.ts`
- **Symbols / signatures:** mover `ProductImage`; exportar
  `getPerUnitPrice(terms: Pick<CatalogClientTerms, "refPrice" | "moqPrice" | "moq">):
  number | null`.
- **Change (operational, not finished code):**
  - Mover el componente sin cambiar su contrato y actualizar todos sus importers.
  - Extraer la lógica privada de `ProductPriceBlock`: preferir `refPrice`; si no existe,
    derivar `moqPrice / moq`; devolver `null` ante datos inválidos o MOQ ≤ 0.
  - Hacer que `ProductPriceBlock` consuma el helper compartido.
- **Mirror this pattern:** `selectProductImage` y sus tests en los mismos helpers.
- **Depends on:** none.
- **Acceptance:** no queda ningún import a
  `~/app/products/_components/product-image`; catálogo y preview admin renderizan igual;
  tests cubren ref explícita, derivación, cero e inválido.
- **Pitfalls:** No convertir el componente en Client Component innecesariamente; mantener
  el fallback accesible; no duplicar aritmética monetaria en el home.

### T4 — Simplificar y hacer explícito el read model de ofertas

- **Files:** `src/server/services/home/home.data.ts`,
  `src/server/services/home/home.service.ts`, `src/schemas/home.schemas.ts`,
  `src/shared/common/home.types.ts`
- **Symbols / signatures:** `CurrentHomeOfferRecord`, `currentTermsSelect`,
  `listCurrentHomeOffers()`, `mapHomeOffer()`, `getHomeOffers()`,
  `homeOfferSchema`; eliminar `FeaturedHomeProductRecord`,
  `listFeaturedHomeProducts()`, `mapFeaturedProduct()`,
  `getHomeFeaturedProducts()`, `homeFeaturedProductSchema` y su type.
- **Change (operational, not finished code):**
  - Reemplazar el ambiguo `HomeOffer.id` por `productId` y
    `productClientTermsId`.
  - Mantener solo los campos de presentación acordados; quitar fechas del output si
    ningún consumidor las usa.
  - Reutilizar schemas de currency/unit del catálogo en vez de duplicar enums.
  - Conservar límite default 4, vigencia y orden actuales.
  - Eliminar la segunda consulta de “featured products” y todo su contrato muerto.
- **Mirror this pattern:** `src/schemas/catalog.schemas.ts` para unit/currency/Client
  terms; `currentTermsWhere()` para vigencia.
- **Depends on:** none.
- **Acceptance:** `HomeOffer` distingue producto y términos; cuatro ofertas seed se
  parsean; `rg "HomeFeaturedProduct|getHomeFeaturedProducts|listFeaturedHomeProducts"`
  no devuelve consumidores.
- **Pitfalls:** El key de card debe ser `productClientTermsId`; el deep link usa
  `productId`. Si aparecen duplicados de producto, deduplicar preservando el orden más
  reciente.

### T5 — Hacer URL-addressable el diálogo de producto

- **Files:** `src/app/products/_components/use-catalog-params.ts`,
  `src/app/products/_components/products-client.tsx`,
  `src/app/products/_components/product-details-dialog.tsx` (solo si el error/not-found
  necesita ajuste)
- **Symbols / signatures:** `useCatalogParams()` agrega
  `productId: number | null`, `setProductId(id: number | null): void`; eliminar
  `selectedProductId` local de `ProductsClient`.
- **Change (operational, not finished code):**
  - Parsear solo enteros positivos del param `product`.
  - Abrir detalles mediante `setProductId`; cerrar elimina únicamente `product`.
  - Mantener filtros, página, sort y view intactos al abrir/cerrar.
  - Hacer que back/forward restaure correctamente el diálogo.
  - Mantener un estado de error cerrable si el id ya no está disponible.
- **Mirror this pattern:** `commit()` y setters existentes de
  `src/app/products/_components/use-catalog-params.ts`.
- **Depends on:** none.
- **Acceptance:** carga directa, refresh y navegación history sobre
  `/products?product=<id>` abren el producto; cerrar deja `/products` con el resto de
  params; ids inválidos no ejecutan query.
- **Pitfalls:** `reset()` no debe borrar necesariamente `product` mientras el diálogo
  está abierto; no resetear filtros al abrir; evitar loop entre `Dialog.onOpenChange` y
  `router.replace`.

### T6 — Reescribir el modelo de contenido del home

- **Files:** `src/features/home/home-content.ts`
- **Symbols / signatures:** actualizar `homeNavLinks`; reemplazar
  `howItWorksSteps` por tres pasos; crear `heroBenefits`, `faqItems`; reducir
  `contactItems`; eliminar `joinSteps` y `featuredBenefits`.
- **Change (operational, not finished code):**
  - Anclas: `/#como-funciona`, `/#ofertas`, `/#preguntas-frecuentes`, `/#contacto`.
  - Tres pasos fieles al código: explorar/carrito; registro-entrega-pago;
    consolidación-seguimiento-entrega.
  - Beneficios breves integrables al hero, sin crear otra sección.
  - Seis FAQs aceptadas durante grilling, con respuesta clara sobre cuenta, cantidad
    mínima, pago, reprogramación y seguimiento.
  - Mantener mock `contacto@coco.app` y `+54 9 11 0000-0000` centralizados.
  - Usar voseo, tildes y “cantidad mínima”; reservar `MOQ` para pantallas técnicas.
- **Mirror this pattern:** arrays tipados con `LucideIcon` del archivo actual.
- **Depends on:** none.
- **Acceptance:** no queda copy que diga que Coco consolida antes del pago ni que el
  usuario no cubre su cantidad mínima; las seis FAQs son strings estáticos y serializables.
- **Pitfalls:** No prometer descuento, fecha de consolidación, refund automático ni
  stock confirmado por proveedor.

### T7 — Rediseñar el hero dinámico

- **Files:** `src/features/home/_components/home-hero.tsx`
- **Symbols / signatures:** `HomeHero({ spotlightOffer?: HomeOffer })`; eliminar
  `isActiveUser` y `canAccessAdmin`.
- **Change (operational, not finished code):**
  - Layout split responsive: mensaje/CTAs + visual de producto.
  - CTA primario “Ver ofertas” `/products`; secundario `#como-funciona`.
  - Integrar `heroBenefits` como prueba rápida, no cards completas.
  - Si existe oferta, mostrar imagen, marca, nombre, precio de bloque y cantidad mínima
    con enlace `/products?product=<productId>`.
  - Sin oferta, renderizar composición CSS/iconográfica de marca `aria-hidden`, sin
    placeholder gris ni asset nuevo.
  - Usar superficie teal/tinta y highlight con contraste; no cubrir la imagen con una
    capa opaca que la vuelva decorativa.
- **Mirror this pattern:** grid y max-width actuales; `ProductImage` compartido de T3;
  `HomeOfferCard` de T9 solo como referencia visual, no como dependencia circular.
- **Depends on:** T1, T3, T4, T6.
- **Acceptance:** ambos estados (con/sin oferta y con/sin imagen) mantienen la jerarquía;
  CTA de compra siempre público; hero no expone accesos admin.
- **Pitfalls:** No repetir todas las acciones de la oferta-card; asegurar lectura sobre
  el fondo y orden mobile copy→producto.

### T8 — Convertir Cómo funciona en secuencia de tres pasos

- **Files:** `src/features/home/_components/how-it-works-section.tsx`,
  `src/features/home/_components/section-heading.tsx`
- **Symbols / signatures:** mantener `HowItWorksSection()`; refinar `SectionHeading`
  solo con props aditivas si requiere alineación/clase.
- **Change (operational, not finished code):**
  - Añadir `id="como-funciona"` y `scroll-mt-*`.
  - Reemplazar cuatro Cards por timeline/secuencia conectada de tres pasos.
  - Numeración, icono, título y una descripción breve por etapa.
  - Agregar enlace contextual “Ver preguntas frecuentes” a
    `#preguntas-frecuentes`.
  - Usar una superficie aqua/menta amplia para separar la sección.
- **Mirror this pattern:** `howItWorksSteps` de T6 y tipografía de
  `SectionHeading`.
- **Depends on:** T1, T6.
- **Acceptance:** flujo correcto en desktop/mobile; conector no sugiere un paso extra;
  ancla desde hero/nav cae debajo del sticky header.
- **Pitfalls:** En mobile el conector debe ser vertical o desaparecer; no encerrar cada
  paso en una card con sombra.

### T9 — Crear tarjeta específica y sección de ofertas

- **Files:** `src/features/home/_components/home-offer-card.tsx` `[NEW]`,
  `src/features/home/_components/offers-section.tsx` `[NEW]`,
  `src/features/home/_components/current-offers-section.tsx` (delete),
  `src/features/home/home-formatters.ts`
- **Symbols / signatures:** `HomeOfferCard({ offer }: { offer: HomeOffer })`,
  `OffersSection({ offers }: { offers: HomeOffer[] })`; reemplazar formatters ambiguos
  por helpers de precio de bloque y referencia unitaria.
- **Change (operational, not finished code):**
  - Tarjeta server-compatible basada en `Card`, `ProductImage`, `Badge`, `Button/Link`
    y helpers compartidos; sin callbacks ni store de carrito.
  - Mostrar `moqPrice` como headline, “Cantidad mínima …” y referencia por unidad si
    `getPerUnitPrice()` devuelve valor.
  - CTA `/products?product=<productId>`.
  - Grid 1/2/4 columnas y acción superior “Ver todo el catálogo”.
  - Estado vacío de marca con CTA `#contacto`; conservar `id="ofertas"`.
- **Mirror this pattern:** composición visual de
  `src/app/products/_components/product-card.tsx`, sin su interacción; precio de
  `src/app/products/_components/product-price-block.tsx`.
- **Depends on:** T1, T3, T4, T5, T6.
- **Acceptance:** hasta cuatro cards correctas; no se renderiza descripción larga,
  descuento, countdown ni “Ver operaciones”; el link abre el diálogo específico.
- **Pitfalls:** No importar `ProductCard`; no usar `refPrice` como headline; fallback de
  imagen debe usar superficie de marca, no gray hardcoded.

### T10 — Implementar Preguntas frecuentes

- **Files:** `src/features/home/_components/faq-section.tsx` `[NEW]`
- **Symbols / signatures:** `FaqSection()` usando `faqItems`.
- **Change (operational, not finished code):**
  - Sección `id="preguntas-frecuentes"` con heading y Accordion single/collapsible.
  - Renderizar exactamente las seis preguntas aceptadas.
  - Mantener respuestas cortas, links a `/products`, `/login`, `/my-orders` o
    `#contacto` solo cuando aclaren el siguiente paso.
  - Superficie marfil/cálida diferenciada sin una card exterior por pregunta.
- **Mirror this pattern:** Accordion T2; `SectionHeading`.
- **Depends on:** T1, T2, T6.
- **Acceptance:** teclado, foco y aria correctos; enlaces de nav/how/footer llegan a la
  sección; texto de reprogramación no agrega garantías.
- **Pitfalls:** No incluir el formulario autenticado ni políticas no implementadas;
  evitar respuestas tan largas que transformen el home en documentación.

### T11 — Rediseñar Contacto y Footer

- **Files:** `src/features/home/_components/contact-section.tsx`,
  `src/features/home/_components/home-footer.tsx`
- **Symbols / signatures:** `ContactSection({ isActiveUser: boolean })`,
  `HomeFooter()`.
- **Change (operational, not finished code):**
  - Contacto como una franja única de alto contraste con CTA comprar, email y WhatsApp.
  - CTA secundario: anónimo → `/login?callbackURL=/products`; usuario activo →
    `/my-orders`. Comprar sigue siendo primario.
  - Eliminar tres cards y el texto repetido “Dato temporal...”.
  - Mantener atributos seguros para WhatsApp externo y enlaces `mailto`.
  - Footer reducido con marca, anclas compartidas, catálogo, ingreso/pedidos y legal;
    incluir link a FAQ, no el acordeón completo.
- **Mirror this pattern:** links externos actuales de Contacto; `homeNavLinks` de T6.
- **Depends on:** T1, T6.
- **Acceptance:** `id="contacto"` funciona; canales mock coinciden con contenido
  centralizado; no aparece un formulario; jerarquía CTA cambia correctamente por sesión.
- **Pitfalls:** Los mocks son deliberados solo para desarrollo; no introducir env vars
  porque no son secretos, pero sí mantener un único origen de contenido.

### T12 — Recompone la página y retirar secciones duplicadas

- **Files:** `src/app/page.tsx`,
  `src/features/home/_components/join-section.tsx` (delete),
  `src/features/home/_components/featured-section.tsx` (delete),
  `src/features/home/_components/featured-product-card.tsx` (delete)
- **Symbols / signatures:** `Home()`; imports y metadata.
- **Change (operational, not finished code):**
  - Obtener solo sesión + ofertas en paralelo.
  - Eliminar `isAdminRole/canAccessAdmin` del home; el navbar conserva ese acceso.
  - Renderizar orden acordado y pasar `isActiveUser` solo a Contacto.
  - Actualizar metadata/copy con tildes correctas y propuesta de valor consistente.
  - Eliminar componentes y imports muertos.
- **Mirror this pattern:** server data fetch actual de `Home()`.
- **Depends on:** T4, T7–T11.
- **Acceptance:** un único request de datos de producto para el home; no quedan imports
  a Join/Featured; estructura DOM y orden de headings son correctos.
- **Pitfalls:** Mantener `main` único; no duplicar el footer global (hoy es propio del
  home); no convertir `page.tsx` en Client Component.

### T13 — Rediseñar navbar público y mobile

- **Files:** `src/components/app-navbar.tsx`,
  `src/components/mobile-nav-menu.tsx` `[NEW]`,
  `src/features/home/home-content.ts`
- **Symbols / signatures:** `AppNavbar({ session })`, `MobileNavMenu({ isActiveUser,
  canAccessAdmin })`.
- **Change (operational, not finished code):**
  - Quitar `HomeIcon`/botón “Home”; marca enlaza a `/`.
  - Desktop: anclas públicas, CTA “Comprar”, carrito, sesión y dropdown admin actual.
  - Mobile: mantener marca + carrito + acceso de sesión visibles según espacio y usar
    `Sheet` para anclas, catálogo, Mis pedidos y acceso admin de primer nivel.
  - Usar hrefs absolutos `/#...` para funcionar desde otras rutas.
  - Agregar `z-index`, backdrop y borde compatibles con nuevas superficies.
  - Cerrar Sheet al navegar y conservar labels/aria del menú.
- **Mirror this pattern:** `src/components/ui/sheet.tsx`; lógica de rol y dropdown
  actuales en `AppNavbar`.
- **Depends on:** T1, T6.
- **Acceptance:** 360 px no hace wrap de dos filas; 1440 px muestra nav completo; carrito,
  UserMenu y admin siguen funcionando; links de ancla desde `/products` regresan a home.
- **Pitfalls:** No duplicar toda la navegación admin dentro del Sheet; no ocultar el
  carrito; evitar que header quede detrás de Dialog/Sheet (sus overlays usan `z-50`).

### T14 — Agregar pruebas de helpers y recorridos críticos

- **Files:** `src/shared/common/commerce.helpers.test.ts`,
  `src/features/home/home-formatters.test.ts` `[NEW]`, `e2e/smoke.spec.ts`
- **Symbols / signatures:** casos de `getPerUnitPrice`, formatters de oferta y tests
  Playwright del home.
- **Change (operational, not finished code):**
  - Unit: precio unitario explícito/derivado/inválido; headline siempre `moqPrice`.
  - E2E público: hero y cinco anclas existen; links principales apuntan a `/products`;
    card de seed usa `?product=`; navegación abre diálogo y close limpia param.
  - E2E mobile: botón de menú abre Sheet y expone anclas/Comprar.
  - E2E vacío solo si puede fixturearse sin mutar datos compartidos; de lo contrario,
    cubrirlo mediante revisión manual y mantener el branch simple.
- **Mirror this pattern:** Vitest actual de commerce helpers y smoke Playwright.
- **Depends on:** T3–T13.
- **Acceptance:** `pnpm test` y `pnpm test:e2e` pasan con seed estándar; tests no dependen
  del texto completo de párrafos ni de timestamps.
- **Pitfalls:** No agregar React Testing Library solo para esta feature; selectores E2E
  deben basarse en roles/headings/ids estables.

### T15 — Accesibilidad, responsive y auditoría visual final

- **Files:** `src/styles/globals.css`, `src/app/page.tsx`,
  `src/components/app-navbar.tsx`, `src/components/mobile-nav-menu.tsx` `[NEW]`,
  `src/features/home/_components/home-hero.tsx`,
  `src/features/home/_components/how-it-works-section.tsx`,
  `src/features/home/_components/home-offer-card.tsx` `[NEW]`,
  `src/features/home/_components/offers-section.tsx` `[NEW]`,
  `src/features/home/_components/faq-section.tsx` `[NEW]`,
  `src/features/home/_components/contact-section.tsx`,
  `src/features/home/_components/home-footer.tsx`,
  `src/features/home/_components/section-heading.tsx`
- **Symbols / signatures:** semántica de headings/sections, focus states, scroll offset,
  reduced motion y contrastes.
- **Change (operational, not finished code):**
  - Un solo `h1`; `h2` por sección; heading order de cards/Accordion correcto.
  - `scroll-margin` para el header sticky; smooth scroll solo si el usuario no pide
    reduced motion.
  - Foco visible en CTA, offer cards, Accordion y mobile menu.
  - Imágenes de producto con nombre accesible; decoraciones del fallback ocultas.
  - Verificar contraste de teal/tinta/highlight y estados hover/focus.
  - Revisar 360, 768, 1024 y 1440 px, además de contenido largo y ofertas sin imagen.
  - Smoke visual de `/products`, `/cart`, `/checkout`, `/my-orders` y una pantalla admin
    por el retintado global.
- **Mirror this pattern:** focus/ring contracts de `Button`, `Sheet`, `Accordion`.
- **Depends on:** T1–T14.
- **Acceptance:** sin overflow horizontal, nav sin wrap, CTAs alcanzables por teclado,
  contrastes legibles y rutas no-home sin regresión material.
- **Pitfalls:** No resolver contraste con raw hex/OKLCH dentro de JSX; ajustar tokens.

## 9. Cross-cutting concerns

- **Data / schema / migration / backfill:** No hay cambio Prisma ni migración. Solo se
  reduce y aclara el read model TypeScript/Zod del home.
- **Config / env / feature flags:** No se agregan env vars ni flag. Contactos mock viven
  como contenido público centralizado. El dark-mode toggle sigue fuera de scope.
- **Security / permissions:** Catálogo y home permanecen públicos; checkout, pedidos y
  formulario futuro conservan/usarían guards existentes. El navbar no debe inferir
  acceso admin fuera de `isAdminRole`.
- **Observability (logs / metrics / tracing):** N/A en esta feature. No existe proveedor
  de analytics acordado; no instrumentar eventos ad hoc.

## 10. Pitfalls & gotchas (global)

- `HomeOffer.id` hoy es id de Client terms. No usarlo como product id; aterrizar T4 antes
  de construir links.
- El pago ocurre antes de agregación. Cualquier copy que diga “Coco consolida y luego
  pagás” es una regresión funcional de comunicación.
- Client MOQ es la cantidad mínima que ese usuario puede comprar; no afirmar “no tenés
  que cubrirla solo”. La agregación ocurre frente a las condiciones del proveedor.
- El param `product` debe convivir con todos los filtros actuales y no desaparecer al
  abrir/cerrar el diálogo.
- El `ProductCard` interactivo no es un primitive de presentación; no hacerlo configurable
  con callbacks opcionales para servir al home.
- El cambio de `ProductImage` alcanza preview admin además del catálogo; actualizar todos
  los imports en la misma tarea.
- No usar `warning` para el coral/ámbar decorativo; mantiene significado de estado.
- Un retoque a `background/muted/secondary` se propaga globalmente; verificar rutas no-home.
- Los links de navbar deben ser `/#ancla`, mientras los links dentro del home pueden ser
  `#ancla`.
- Los datos de contacto son mock por decisión temporal. No presentarlos como definitivos
  en una release real.

## 11. Testing & validation

- **Tests to add/update:**
  - `src/shared/common/commerce.helpers.test.ts`: cálculo unitario compartido.
  - `src/features/home/home-formatters.test.ts`: jerarquía precio bloque/referencia.
  - `e2e/smoke.spec.ts`: secciones, CTAs, deep link, diálogo y mobile nav.
- **Commands:**
  - `pnpm test`
  - `pnpm typecheck`
  - `pnpm check`
  - `pnpm build`
  - `pnpm test:e2e`
- **Manual checks / regression risks:**
  1. `/` anónimo con ofertas, sin imagen y sin ofertas.
  2. `/` autenticado: CTA secundario a Mis pedidos; comprar sigue público.
  3. `/products?product=<seed-id>` carga, refresh/back/close conservan filtros.
  4. Navbar a 360/768/1440; anchor navigation desde `/products`.
  5. Teclado completo: navbar, hero, cards, Accordion, Contacto.
  6. Contraste y hover/focus en light y `.dark` manual.
  7. Smoke de catálogo, carrito, checkout, pedidos y admin tras retintado.
- **Success criteria:** Toda la suite verde; un usuario nuevo puede entender el flujo y
  llegar de hero/oferta al producto concreto sin login; no hay promesas contrarias al
  backend; el home usa color de forma visible sin degradar otras rutas.

## 12. Rollout, migration & rollback

- **Rollout:** Implementar y publicar Phases 1–5 juntas para que ningún CTA llegue a un
  deep link incompleto. No se requiere migración ni dual path.
- **Pre-production gate:** Reemplazar email/WhatsApp mock antes de exposición real. Si
  todavía es un entorno de desarrollo/demo, documentar explícitamente que el gate sigue
  pendiente.
- **Compatibility:** Los tokens/variants son aditivos salvo el retintado leve de tokens
  base; contratos de carrito/checkout/catalog list no cambian.
- **Rollback:** Revertir composición + navbar + tokens; no hay estado ni datos que
  restaurar. Si solo la paleta genera regresión, revertir el retintado de tokens base y
  conservar los nuevos tokens/variantes sin uso.
- **Post-release:** Revisar clicks/feedback cualitativo sobre CTA y comprensión del flujo;
  analytics queda diferido hasta elegir herramienta.

## 13. Documentation updates

- `docs/plans/home-ui-ux-redesign.md`: este plan.
- **CONTEXT.md:** agregado **Featured offer**, definido como producto vigente destacado
  automáticamente sin implicar promoción, descuento ni Operation.
- **ADRs:** None. Paleta, composición y query param son decisiones reversibles y no
  superan el umbral ADR.

## 14. Risks & trade-offs

| Risk | Why it matters | Likelihood | Impact | Mitigation |
| --- | --- | --- | --- | --- |
| Retintado global afecta pantallas no-home | Tokens base se consumen en toda la app. | Medium | Medium | Cambios leves + smoke de rutas; fallback a tokens nuevos solo explícitos. |
| “Oferta” se interpreta como descuento | No existe modelo promocional. | Medium | Medium | Copy “Ofertas destacadas”/“condiciones vigentes”; sin porcentaje ni ahorro. |
| Usuario espera refund por reprogramación | No hay plazo/reintegro automático en código. | Medium | High | FAQ precisa, sin promesa; soporte como canal de excepción. |
| Deep link abre id inexistente | La oferta puede vencer entre home y catálogo. | Low | Medium | Error cerrable y catálogo utilizable; no ejecutar ids inválidos. |
| Hero sin imágenes pierde fuerza | Datos seed/reales pueden no tener media. | High | Low | Fallback gráfico de marca diseñado, no placeholder gris. |
| Navbar queda denso para admins | Suma anclas a controles existentes. | Medium | Medium | Navegación responsive; admin completo solo desktop, acceso top-level mobile. |
| Precio vuelve a divergir home/catálogo | Hoy existen formatters separados. | Medium | Medium | Extraer `getPerUnitPrice`; headline bloque mínimo en ambos. |
| Contactos mock llegan a producción | Los links no sirven a clientes reales. | Medium | High | Gate explícito de rollout y origen centralizado. |

## 15. Open questions

- **Blocking (resolve before execution):** None.
- **Non-blocking (resolve during execution):**
  - Valores OKLCH exactos: mantener dirección acordada y ajustar mediante revisión visual
    con contraste; default = primary teal actual + superficies de baja saturación.
  - Si hay ofertas duplicadas por producto: default = deduplicar por `product.id`
    conservando la Client terms más reciente.
  - Copy final de CTA secundario anónimo: default = “Ingresar o registrarme” para reflejar
    el alta implícita de Google.
  - Movimiento: default = transiciones cortas de hover/Accordion y ninguna animación
    ornamental persistente.
- **Optional refinements:**
  - Analytics de `hero_buy`, `offer_open`, `faq_open`, `contact_click`.
  - Curaduría admin de ofertas.
  - Formulario autenticado de contacto.
  - Migración cromática del catálogo/admin.

## 16. Definition of done

- [ ] Home contiene Hero, Cómo funciona, Ofertas, FAQ, Contacto y Footer en ese orden.
- [ ] Join/Featured y su query/schema/type muertos fueron eliminados.
- [ ] Hero compra primero, usa oferta protagonista y tiene fallback sin gris.
- [ ] Cómo funciona tiene tres pasos y comunica pago antes de consolidación.
- [ ] Ofertas muestran precio de bloque mínimo, referencia unitaria y deep link exacto.
- [ ] `/products?product=<id>` funciona con refresh/back/close sin romper filtros.
- [ ] FAQ contiene las seis preguntas aceptadas y es accesible por teclado.
- [ ] Contacto usa WhatsApp/email mock y no incluye formulario.
- [ ] Navbar no duplica Home, tiene anclas/Comprar y un menú mobile sin wrap.
- [ ] Nueva paleta usa tokens/variantes, no colores raw en componentes.
- [ ] `ProductImage` y cálculo unitario tienen una única implementación compartida.
- [ ] Estados con/sin ofertas y con/sin imágenes están resueltos.
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm check`, `pnpm build` y `pnpm test:e2e` pasan.
- [ ] Rutas no-home fueron revisadas por el impacto de tokens.
- [ ] Reemplazo de contactos mock figura como gate previo a producción.

## 17. Instructions for the executing agent

- Use this plan as the primary source; read first:
  `CONTEXT.md`, `src/app/page.tsx`, `src/features/home/home-content.ts`,
  `src/features/home/_components/home-hero.tsx`,
  `src/features/home/_components/how-it-works-section.tsx`,
  `src/features/home/_components/current-offers-section.tsx`,
  `src/features/home/_components/contact-section.tsx`,
  `src/features/home/_components/home-footer.tsx`,
  `src/server/services/home/home.data.ts`,
  `src/server/services/home/home.service.ts`,
  `src/styles/globals.css`, `src/components/app-navbar.tsx`,
  `src/app/products/_components/use-catalog-params.ts`,
  `src/app/products/_components/products-client.tsx`,
  `src/app/products/_components/product-card.tsx`,
  `src/shared/common/commerce.helpers.ts`.
- Respect these settled decisions: compra primaria; registro secundario; pago antes de
  consolidación; oferta automática sin significado promocional; cinco secciones; FAQ
  propia; contacto directo mock; formulario autenticado diferido; teal + tinta + marfil
  + aqua/menta + coral/ámbar; adopción cromática completa solo en home/navbar.
- Do not change: cart/checkout/payment/operations/tracking behavior, catálogo list
  contract, admin permissions, or existing catalog filter params.
- Verify before modifying: todos los importers de `ProductImage`; que `product` sigue
  libre como query param; que `product.id` está presente en `CurrentHomeOfferRecord`;
  que el seed usado por E2E contiene al menos una oferta vigente.
- Execute phases in order; honor task dependencies. T4/T5 must land before offer CTAs.
- Implement at the level specified — write the code the tasks describe; do not
  re-architect. If a blocking question appears, stop and ask; for non-blocking gaps,
  proceed on the stated default and note the assumption.
- Keep code self-explanatory: do not add comments that restate what the code does. Use
  inline or block comments only for non-obvious rationale, invariants, constraints,
  workarounds, subtle behavior, or decisions; link this plan or an ADR when applicable.
  Preserve or update structured JSDoc/TSDoc according to repository conventions. Remove
  comments in touched code that become stale or redundant, but do not perform unrelated
  comment cleanup. Keep required directives and suppression comments narrowly scoped and
  explain why they are necessary.
