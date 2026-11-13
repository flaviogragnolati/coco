# WP-E: categorías en la barra (#102)

> **Estado:** implementado, revisado y mergeado en `main` (`38f85c5`); validación conjunta y cierre operativo en la orquestación §13.
> **Origen:** `qa-open-tickets-2026-11-orchestration.md`, §6, WP-E. Trabajo directo, sin grill; alcance y comportamiento ya definidos.

## Resultado

- `catalog.categories` es una consulta pública con salida validada. Solo devuelve categorías activas y no eliminadas que tengan al menos un producto activo, no eliminado y con términos de cliente vigentes, con los mismos límites de fecha inclusivos del catálogo.
- Se ordenan por `sortOrder`, nombre e id. La salida reutiliza `toCatalogCategory`, por lo que los indicadores internos de la categoría no salen al cliente.
- `AppNavbar` lee las categorías en el servidor una vez por render y las comparte con el desplegable de escritorio y el menú móvil. Cada enlace lleva a `/products?categoria=<id>`; si no hay categorías, no aparece la sección.
- En móvil, elegir una categoría cierra el panel. La navegación del panel puede desplazarse si la lista no entra en pantalla.
- El buscador conserva su comportamiento. El tutorial replica visualmente el botón de categorías con un control estático, sin cargar datos ni agregar requests (ADR 0012).
- `CONTEXT.md` documenta cómo se usan las categorías en la navegación. No hay entidades ni entradas nuevas del admin, ni migración.

## Validación

- `node_modules/.bin/tsgo --noEmit`: OK.
- Pruebas enfocadas de catálogo y tutorial: 68/68 OK.
- `biome check` sobre los archivos de WP-E: OK.
- `biome check .`: bloqueado por formato ajeno preexistente en `output/product-covers/` y por el salto final faltante de `package.json`; esos archivos se preservaron.
- Suite completa: 2108 tests en verde y 6 salteados, en 146 archivos en verde y 1 salteado.
- `biome check src scripts e2e`: OK.
- E2E contra la base local descartable, usando el runner `/tmp/coco-qa-resume/run-e2e-local.sh` con variables de entorno locales y sin editar `.env`: 35/35 en verde, sin reintentos (`navbar-categories` 2, `customer-tutorial` 9, `catalog-category-filter` 3, `catalog-product-card` 5, `smoke` 16). Log temporal: `/tmp/coco-qa-resume/wpe-e2e.log`.
- El tutorial completo conserva el test de no tocar el pedido real. El log sigue mostrando el hydration mismatch preexistente de `CatalogFiltersSidebar/SectionTitle`, documentado por WP-A/WP-B; no hizo fallar la corrida.
- Caso adicional a 1024 px: OK, categorías y contador visibles, sin overflow horizontal de la barra. El spec de categorías completo pasó 3/3 en una segunda corrida sin reintentos (15,6 s). Captura inspeccionada: `/tmp/coco-qa-resume/wpe-navbar-1024.png`; log: `/tmp/coco-qa-resume/wpe-navbar-1024.log`.
- Mini revisión independiente (`review_recovery`): pasan los ejes de estándares y especificación, sin hallazgos; revisión de comentarios OK (0 comentarios/docstrings nuevos en producción). El revisor volvió a correr los 3 tests del catálogo y verificó el caso responsive y su captura.

## QA al cerrar

#102 pasa a **Re-test** después de integrar, desplegar y aplicar el triage autorizado. Mirar: desplegable Categorías en escritorio y sección Categorías del menú móvil; enlaces al catálogo filtrado; cierre del panel al navegar; categorías ocultas cuando no quedan productos vigentes. El orquestador agrega la transición a `qa-ticket-triage.data.ts`.
