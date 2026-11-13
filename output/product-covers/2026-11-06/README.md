# Portadas del catálogo — 6 de noviembre de 2026

27 imágenes originales, una por producto de la base configurada al iniciar el trabajo. Generadas con la herramienta integrada `image_gen`, usando la composición y paleta de la referencia de almendras y el acabado fotográfico del prompt del usuario.

- `index.html`: galería local de los 27 productos; cada imagen enlaza al PNG original.
- `*.png`: originales de 1254 × 1254 píxeles.
- `*.webp`: versiones para el catálogo, misma resolución, calidad 88.
- `prompts.json`: prompt completo por ID de producto.
- `manifest.json`: correspondencia entre ID, nombre, archivos, URL pública, tamaño y SHA-256 de cada WebP; incluye el valor previo de la portada.
- `database-verification.json`: resultado de la lectura posterior a la asignación de portadas.

Los mixes económico, deportivo y antioxidante, las frutas desecadas surtidas y la granola utilizan ingredientes ilustrativos habituales: la base no detalla sus recetas. Las imágenes no acreditan la composición comercial exacta. El mix de semillas sí sigue los cuatro ingredientes indicados en su nombre.

Los aceites se muestran como muestras de líquido con tres gotas; la pasta de maní, como una muestra con tres pequeñas porciones. No se representan envases ni etiquetas. Cada presentación de aceite tiene una generación independiente.

La asignación actualiza únicamente `product.cardImageUrl` y `updatedAt`, con verificación del ID, nombre y portada previa. El catálogo y el carrito ya usan esa portada mediante la lógica de selección existente. Los enlaces públicos se comprueban descargando cada archivo y comparando su SHA-256 antes de actualizar la base en una transacción.
