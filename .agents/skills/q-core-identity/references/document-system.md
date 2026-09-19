# Sistema documental de Ingeniería Quasar

## Tipografía

La única cadena declarada para texto proporcional es `Aptos, Arial, sans-serif`. Para código, rutas e identificadores usar `"Aptos Mono", Consolas, monospace`. `Cambria Math` es la única excepción y se limita a expresiones matemáticas.

En DOCX declarar Aptos y Aptos Mono en estilos y runs; usar `altName` Arial y Consolas en `fontTable.xml`. No incrustar fuentes propietarias. El receptor resuelve la declaración con las fuentes licenciadas de su entorno.

La generación raster usa `generation_slot: Arial` y resuelve, en orden, un archivo Arial local, Liberation Sans local o DejaVu Sans local. Esa resolución no cambia la familia declarada: solo suministra métricas y glifos para portada y pie. Si ningún archivo regular y bold resuelve, bloquear únicamente el formato raster afectado.

Registrar `font_profile` con `declared_family`, `declared_fallback`, `generation_slot`, `generation_resolved`, `regular_path` y `bold_path`. Una salida nunca afirma que el raster usa Aptos cuando la provenance nombra otra resolución.

## Página y jerarquía

- Formato A4 vertical, `210 × 297 mm`.
- Márgenes de cuerpo: `18 mm` a izquierda y derecha, `30 mm` arriba y `29 mm` abajo.
- Portada a página completa con `assets/cover-pattern.png` y logotipo horizontal.
- Páginas interiores con `assets/body-header.png`, fecha, versión, hash abreviado y numeración sobre el pie.
- Cuerpo base de `9.5 pt`; H1 `15.5 pt`; H2 `11.5 pt`; H3 `10 pt`; tablas `8.5 pt`; notas y pie `7–8 pt`.

## Versión, provenance y confidencialidad

Todo binario derivado registra fuente, versión, SHA-256, generador, instante de generación, `creation_mode: derived`, `semantic_authority: none` y el perfil tipográfico. La portada y el pie no introducen contenido comercial, diagnóstico o de reporte.

Mostrar la clasificación autorizada cuando el entregable la requiera. No exponer secretos, datos personales innecesarios, texto contractual no aprobado ni material `restricted`; respetar la clasificación máxima de las fuentes.

## Referencia DOCX

`assets/reference.docx` define theme, font table y estructura base. `scripts/regenerate_reference_docx.py` regenera ese asset y elimina thumbnails, `customXml`, estilos con efectos y media huérfana. Los consumidores pueden ajustar tamaños y colores, pero no reemplazar la declaración tipográfica ni convertir la referencia en autoridad semántica.

