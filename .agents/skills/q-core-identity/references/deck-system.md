# Sistema de presentaciones de Ingeniería Quasar

## Autoridad

Leer [`identity.md`](identity.md) para denominación, logotipos, paleta y reglas de marca. Este archivo aplica esa identidad a decks; no redefine sus tokens ni adquiere autoridad sobre el contenido aprobado.

## Reglas no negociables

- Aplicar los archivos y restricciones de `identity.md` sin reconstruir, recortar ni alterar la marca.
- En un canal Marp, entregar Markdown, theme CSS y assets locales editables y regenerables. En un canal PPTX nativo que exija edición de objetos, conservar textos, formas y gráficos editables dentro del archivo. El PPTX estándar renderizado por Marp puede usar diapositivas pre-renderizadas y no satisface un requisito de edición de objetos.

## Canal Marp

- Usar `assets/marp/quasar.css` y `assets/marp/template-quasar.md` como punto de partida derivado; `identity.md` sigue siendo la fuente de marca.
- Resolver el logotipo y todo asset a una ruta local dentro de los roots autorizados. No usar Google Fonts, `@import`, URLs remotas ni recursos protocol-relative.
- Conservar relación `16:9`, los roles cromáticos de `identity.md` y la tipografía de [`document-system.md`](document-system.md). No agregar gradientes, sombras, glow, biseles ni scripts o HTML arbitrario.
- Entregar el Markdown exacto, el CSS exacto, los assets requeridos, el comando reproducible de render y sus hashes/versiones. Una edición semántica del Markdown vuelve al owner de contenido; la editabilidad técnica no cambia su autoridad.
- Mantener notas mediante comentarios Marpit en la fuente. Verificar y declarar su preservación por formato; no asumir que HTML, PDF, PPTX e imágenes conservan la misma superficie de notas.

## Canvas, márgenes y fondos

- Usar formato `16:9`.
- Usar margen lateral habitual de `0,75–0,85 in` y mínimo absoluto de `0,5 in`.
- Priorizar fondos blancos o muy claros para contenido y azul Quasar para portadas, separadores y cierres.
- Reservar el verde Quasar para acentos, indicadores, líneas de énfasis y superficies puntuales; no usarlo como fondo dominante en muchas diapositivas consecutivas.
- Evitar fotografías de fondo detrás de texto. Cuando se utilicen, aplicar recorte intencional y una superficie de contraste.
- Usar el patrón repetido del isotipo sólo como textura de baja presencia en portada, separador o cierre; nunca detrás de tablas, gráficos o texto extenso.

## Semántica del color

Usar los tokens y alias definidos en `identity.md`.

- Usar el azul como color dominante y el verde como acento.
- Usar un único acento principal por diapositiva.
- No usar verde Quasar para texto pequeño sobre blanco: su contraste es insuficiente. Usarlo como superficie con texto oscuro, como trazo grueso o sobre azul.
- Sobre azul Quasar usar texto blanco; el verde puede usarse para un elemento destacado.
- No usar color como único indicador. Combinarlo con rótulo, forma, número, posición o grosor.
- En gráficos, usar azul para la serie o resultado principal, verde para comparación o avance, grises y tintas para contexto. Agregar otros colores sólo cuando el significado lo exija y documentar la excepción.

## Tipografía y jerarquía

Aplicar el contrato tipográfico de [`document-system.md`](document-system.md); este sistema solo define la jerarquía del deck.
- Mantener títulos afirmativos en una línea siempre que sea posible. Reescribir antes de reducir tipografía.
- Usar como referencia: títulos `28–36 pt`, subtítulos `20–24 pt`, cuerpo `17–20 pt`, metadatos y fuentes `10–12 pt`.
- No bajar de `15 pt` en contenido principal. Dividir o cambiar de patrón antes de comprimir.
- Limitar bullets a cinco filas, preferentemente de una línea y `10–14` palabras.

## Componentes y patrones de presentación

Cada diapositiva debe mapearse al patrón más cercano. No usar todos los patrones por obligación.

### Portada institucional

- Fondo azul Quasar o blanco.
- Logotipo completo con contraste correcto.
- Título, cliente o proyecto, tipo de entrega y fecha.
- `Ingeniería Quasar` puede aparecer como texto institucional secundario, separado del logotipo.
- Usar el isotipo ampliado, su diagonal o el patrón repetido como recurso de fondo de baja presencia.

### Separador de sección

- Una frase o título breve.
- Isotipo grande, diagonal o bloque de color como único recurso visual.
- Mucho espacio negativo; no convertirlo en una diapositiva de contenido.

### Mensaje ejecutivo

- Una conclusión, cifra o decisión principal.
- Título afirmativo y una evidencia corta.
- Puede usar fondo azul, cifra blanca y acento verde.

### Agenda, alcance u objetivos

- Entre tres y cinco elementos.
- Usar una progresión, lista numerada o fila de bloques; evitar una grilla decorativa.
- En capacitación, redactar resultados observables. En consultoría, expresar propósito, alcance y decisiones.

### Dos columnas: argumento y evidencia

- Texto breve a la izquierda y gráfico, figura, tabla o diagrama a la derecha.
- La evidencia debe sostener la afirmación del título; no ser decorativa.

### Hallazgo, evidencia e implicación

- Tres niveles claramente rotulados.
- Separar lo observado, su interpretación y su consecuencia para el cliente.
- Usar azul para estructura y verde sólo para la implicación o recomendación principal.

### Indicadores o cifras clave

- Entre tres y cinco indicadores comparables.
- Mantener unidad, período, base de comparación y fuente.
- Evitar una apariencia de dashboard; priorizar la lectura principal.

### Gráfico y lectura

- El título expresa el hallazgo.
- Mostrar ejes, unidades, período y fuente.
- Destacar una sola serie o dato y usar etiquetas directas.
- Incluir una lectura de una o dos frases cuando el gráfico no sea autoexplicativo.

### Tabla y callout

- Usar sólo cuando la comparación exacta sea necesaria.
- Mantener unidades y formatos consistentes.
- Destacar una fila, celda o decisión central; no colorear toda la tabla.

### Proceso, arquitectura o flujo

- Usar formas nativas y conectores detrás de los nodos.
- Etiquetar etapas y relaciones; no depender sólo de flechas o color.
- Usar la diagonal de la marca como acento, no como conector principal.

### Comparación de alternativas

- Comparar con los mismos criterios y unidades.
- Mostrar ventajas, limitaciones, condiciones y recomendación.
- No construir columnas con criterios distintos.

### Cronograma, roadmap o plan de trabajo

- Entre cuatro y seis hitos principales.
- Destacar un hito o período crítico.
- Mostrar dependencias y responsables sólo cuando sean relevantes para la decisión.

### Riesgos, pendientes y decisiones

- Separar riesgo, impacto, mitigación, responsable y fecha.
- Usar semáforos sólo si existe una definición explícita de cada estado.
- Limitar la diapositiva a los elementos que requieren atención ejecutiva.

### Recomendaciones y próximos pasos

- Formular acciones concretas, priorizadas y asignables.
- Distinguir recomendación, decisión requerida y actividad futura.
- Cerrar con fecha, dueño o condición de avance cuando exista.

### Capacitación o taller

- Mantener visibles consigna, tiempo y producto esperado.
- Incluir claves, orientación o solución sólo en notas.
- Usar datos ilustrativos claramente identificados cuando no se utilicen datos reales.

### Anexo y referencias

- Usar para metodología extensa, tablas completas, definiciones, evidencia secundaria y fuentes.
- Mantener la misma identidad, pero permitir mayor densidad con un mínimo de `15 pt`.

## Composición

- Una diapositiva debe sostener una idea principal.
- Escribir títulos que comuniquen la conclusión, no sólo el tema.
- Preferir una composición plana, limpia y con una jerarquía dominante.
- Evitar apariencia de dashboard, exceso de tarjetas, navegación simulada, botones, sombras, biseles y gradientes.
- Usar tarjetas `2×2` sólo para cuatro elementos comparables; usar filas o tabla para otros tamaños.
- Medir alineaciones, separaciones y anchos; no distribuir objetos a ojo.
- Usar la diagonal del isotipo, el patrón de Q o una banda de color con moderación. No repetir los tres recursos en la misma diapositiva.
- Trasladar detalle oral, excepciones y contexto a las notas; no convertir la diapositiva en una página de informe.

## Datos, gráficos y recursos visuales

- Mantener cifras, unidades, períodos, nombres, fechas y resultados exactamente como aparecen en fuentes aprobadas.
- Aplicar el marcado visible de estimaciones y material ilustrativo definido en [`editorial-standards.md`](editorial-standards.md).
- No completar resultados por inferencia.
- Mantener editables tablas, gráficos y diagramas cuando sea posible.
- Preferir gráficos simples con una lectura principal; evitar 3D, dobles ejes innecesarios y leyendas que puedan reemplazarse con etiquetas directas.
- En tablas, alinear números por decimal cuando corresponda y usar formatos coherentes.
- En diagramas, evitar cruces, conectores ambiguos y flechas que atraviesen formas o etiquetas.
- Recortar imágenes con intención, preservar proporciones y comprobar que cada anotación señale el elemento correcto.
- No reutilizar una imagen salvo que sea un recurso de marca o exista una razón narrativa.

## Fuentes, confidencialidad y accesibilidad

- Incluir fuente visible breve en cifras externas, citas, tablas, gráficos, mapas, figuras y datos de terceros.
- Completar en notas autor o institución, obra o recurso, fecha, página o enlace y fecha de acceso cuando corresponda.
- No usar una diapositiva final de referencias como sustituto de la atribución junto al contenido.
- Agregar texto alternativo significativo a imágenes, gráficos y diagramas.
- Mantener orden de lectura lógico: sección, título, contenido, apoyo, fuente y numeración.
- Verificar contraste y no depender sólo del color.
- Respetar clasificación de confidencialidad, anonimización y restricciones contractuales.
- No ocultar información sensible en notas, metadatos, comentarios o elementos fuera del canvas.

## Notas del orador

- Agregar notas a todas las diapositivas; pueden ser breves en portada y separadores.
- Organizar las notas, cuando corresponda, en: propósito, desarrollo oral, fuente o supuesto, decisión esperada y transición.
- No repetir literalmente todo el texto visible.
- Registrar advertencias, limitaciones y supuestos relevantes.
- En capacitaciones, colocar orientación y solución sólo en notas.
- Recordar que las notas forman parte del archivo y pueden ser leídas por el destinatario.

## Criterios de aceptación

No entregar hasta comprobar:

1. Que cada diapositiva esté mapeada a un patrón y comunique una idea principal.
2. Que se use exclusivamente la marca `Quasar` y no aparezca `Quasar Analytic` ni `Analytic`.
3. Que el logotipo correcto tenga contraste, proporción y área libre adecuados.
4. Que la paleta use azul como dominante, verde como acento y neutrales consistentes.
5. Que no existan placeholders vacíos, objetos duplicados ni nombres genéricos evitables.
6. Que títulos, cuerpos, tablas y gráficos no se corten, superpongan ni cambien de línea inesperadamente.
7. Que cifras, unidades, fechas, nombres, compromisos y fuentes coincidan con los materiales aprobados.
8. Que hechos, estimaciones, ejemplos ilustrativos, interpretaciones y recomendaciones estén diferenciados.
9. Que gráficos, figuras y diagramas tengan fuente, texto alternativo y lectura clara.
10. Que conectores, callouts y anotaciones apunten al elemento correcto.
11. Que todas las diapositivas tengan notas útiles y no contengan información sensible no autorizada.
12. Que cada `[COMPLETAR]` restante sea real, esté descrito con precisión y se informe al entregar.
13. Que cada diapositiva se renderice e inspeccione a tamaño completo y el montaje conserve ritmo y continuidad.
14. Que el canal Marp entregue Markdown, CSS y assets resolubles, y que el comando registrado regenere todos los renders solicitados desde esos archivos exactos.
15. Que el PPTX nativo abra correctamente y conserve objetos editables cuando ese requisito fue solicitado; que un PPTX estándar de Marp esté rotulado como render derivado, no como object-editable.
16. Que el cuerpo común use `17–20 pt` cuando el frame lo permita y no exista texto pequeño sin una restricción real.
