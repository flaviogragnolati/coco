# Spanish clarity reference

Load this reference only for Spanish `improve` work, or for a `rewrite` that explicitly includes clarity and concision. The guidance is written for Spanish syntax and usage; it is not a translation of `clarity-en.md`. Apply it to the supplied meaning without adding facts, deleting qualifications, or imposing one regional variety.

The `C` families adapt general public-domain composition principles to Spanish with original Quasar examples. They also incorporate language-clear practices such as reducing bureaucratic filler, unnecessary nominalization, false cognates, delayed gerunds, and ambiguous anaphora.

## C1 active-voice

Haz visibles al actor y la acción cuando importan. Convierte nominalizaciones evitables en verbos. Conserva la pasiva cuando el agente es desconocido, irrelevante, está protegido o el foco legítimo recae sobre el objeto afectado.

### Señales

- `fue realizado por`, `será llevado a cabo por`, `se procedió a` con un actor conocido;
- `llevar a cabo la implementación`, `realizar una evaluación`, `efectuar la notificación`;
- pasivas reflejas o impersonales que esconden al responsable de una decisión.

### Ejemplos

Antes:

> La revisión de los registros fue realizada por el equipo de seguridad el viernes.

Después:

> El equipo de seguridad revisó los registros el viernes.

Antes:

> El equipo llevó a cabo la implementación del cambio de caché.

Después:

> El equipo implementó el cambio de caché.

Conserva `Se robaron las llaves durante la noche` si la fuente no identifica a quien las robó.

## C2 positive-form

Afirma lo que ocurre cuando una negación obliga a reconstruir el sentido opuesto. Mantén la negación si expresa una prohibición, ausencia, excepción, contraste o riesgo real.

### Señales

- `no procedió a continuar` cuando `se detuvo` significa lo mismo;
- `no es infrecuente`, `no resulta imposible`, `no carece de`;
- instrucciones que describen la conducta deseada sólo mediante prohibiciones indirectas.

### Ejemplos

Antes:

> El proceso no continúa cuando falta el token.

Después:

> El proceso se detiene cuando falta el token.

Antes:

> La opción no está deshabilitada en el plan empresarial.

Después:

> La opción está habilitada en el plan empresarial.

No debilites una regla como `El servicio no debe guardar contraseñas` al pasarla a forma positiva.

## C3 concrete-language

Prefiere actores, acciones, objetos y criterios observables. Evita los sustantivos largos o abstractos cuando una palabra corriente conserva el significado. Ser concreto no autoriza a completar lo que la fuente no dice.

### Señales

- `se produjo una problemática`, `la situación presentó modificaciones`, `hubo una afectación`;
- archisílabos como `problemática` por `problema` o `climatología` por `clima`, sólo cuando ese es el sentido real;
- calcos como `eventualmente` por `finalmente`, `en orden de` por `para`, o `asumir` por `suponer` cuando el contexto evidencia el significado;
- cadenas de sustantivos que esconden quién hizo qué.

### Ejemplos

Antes:

> Se produjo una problemática de rendimiento: la importación tardó 14 minutos.

Después:

> La importación tardó 14 minutos.

Antes:

> El proceso eventualmente terminó después de tres reintentos.

Después:

> El proceso finalmente terminó después de tres reintentos.

Aplica la segunda corrección sólo cuando `eventualmente` significa `finalmente`; en español también puede significar `ocasionalmente`.

Antes:

> El ajuste de configuración produjo una modificación del límite de reintentos, que pasó de tres a cinco.

Después:

> El ajuste de configuración elevó de tres a cinco el límite de reintentos.

## C4 omit-needless-words

Quita palabras que no agregan significado ni una relación necesaria. Conserva las reservas que expresan incertidumbre, alcance, frecuencia, cantidad o riesgo.

### Señales

- `a nivel de`, `de cara a`, `en aras de`, `en lo que respecta a` cuando pueden eliminarse;
- `en base a` cuando basta `según` o `con base en` dentro de la guía editorial aplicable;
- `a través de` usado para cualquier medio, incluso cuando bastan `con`, `por` o `mediante`;
- dobletes como `única y exclusivamente`, `todos y cada uno`, `completo y total`;
- `cabe destacar que`, `es importante señalar que`, `conviene mencionar que`;
- coberturas acumuladas como `quizás podría llegar a` cuando no expresan incertidumbres distintas.

### Ejemplos

Antes:

> De cara a poder iniciar la tarea, la persona operadora debe ingresar el token a nivel del formulario.

Después:

> Para iniciar la tarea, la persona operadora debe ingresar el token en el formulario.

Antes:

> La actualización quizás podría demorar algunas solicitudes hasta dos segundos.

Después:

> La actualización podría demorar algunas solicitudes hasta dos segundos.

`Podría`, `algunas` y `hasta` se conservan porque limitan partes distintas de la afirmación.

Antes:

> El permiso se otorga única y exclusivamente a quienes integran el equipo de guardia.

Después:

> El permiso se otorga sólo a quienes integran el equipo de guardia.

## C5 parallel-structure

Usa formas gramaticales equivalentes para ideas coordinadas. El paralelismo debe aclarar una relación real, no forzar simetría.

### Señales

- una lista que mezcla sustantivos, infinitivos y oraciones sin motivo;
- alternativas emparejadas con estructuras distintas;
- requisitos o criterios de aceptación redactados cada uno con una lógica diferente.

### Ejemplos

Antes:

> El puesto exige revisar incidentes, informes claros y capacitar a analistas nuevos.

Después:

> El puesto exige revisar incidentes, redactar informes claros y capacitar a analistas nuevos.

Antes:

> El equipo puede ejecutar la migración esta noche o su postergación puede hacerse hasta el lunes.

Después:

> El equipo puede ejecutar la migración esta noche o postergarla hasta el lunes.

## C6 cohesion-and-order

Acerca el sujeto al verbo, cada modificador a su referente y cada pronombre al sustantivo que retoma. Ordena causas, condiciones y secuencias sin obligar a releer.

### Señales

- incisos largos entre sujeto y verbo;
- `este`, `eso`, `lo mismo`, `el mismo` o `la misma` con referente ambiguo;
- alternancia entre `tú`, `vos` y `usted` dentro de la misma voz sin propósito;
- gerundio que expresa una acción posterior en vez de simultánea;
- subordinadas encadenadas que esconden la oración principal.

### Ejemplos

Antes:

> El equipo archivó los registros y emitió después un informe describiendo el resultado.

Después:

> El equipo archivó los registros y después emitió un informe que describía el resultado.

El informe es posterior al archivo; la reescritura evita presentar ambas acciones como simultáneas.

Antes:

> El servicio envió el código al cliente, pero el mismo venció antes de ser usado.

Después:

> El servicio envió el código al cliente, pero el código venció antes de ser usado.

Antes:

> Si ingresás con tu cuenta, usted puede descargar el informe.

Después:

> Si ingresás con tu cuenta, podés descargar el informe.

La variante elegida debe seguir la voz ya dominante en el texto o la guía del proyecto.

## C7 paragraph-unit

Da a cada párrafo un tema rector y una progresión visible. Presenta el punto o contexto antes de los ejemplos y separa el material que cumple otra función.

### Señales

- un párrafo reúne decisiones sin relación visible;
- el tema aparece sólo en la última oración;
- ejemplos y excepciones preceden a la regla que modifican;
- varias oraciones de una línea se separan sólo para producir ritmo visual.

### Ejemplo

Antes:

> La versión cambia la autenticación. El equipo de soporte atiende en dos regiones. Los tokens vencen a los 30 minutos y cada token de renovación rota después de usarse. También cambió la pantalla de ingreso.

Después:

> La versión cambia la autenticación. Los tokens vencen a los 30 minutos, cada token de renovación rota después de usarse y la pantalla de ingreso cambió.
>
> El equipo de soporte atiende en dos regiones.

Los hechos no cambian; cada párrafo tiene un asunto propio.

## C8 emphatic-placement

Ubica el punto respaldado más importante donde reciba el énfasis adecuado, a menudo al final. No agregues dramatismo ni ocultes condiciones necesarias.

### Señales

- la oración termina con un trámite menor después de comunicar la decisión;
- el contraste principal queda encerrado en un inciso;
- una introducción larga demora sin necesidad al actor y la acción;
- la condición que controla una decisión aparece como comentario secundario.

### Ejemplos

Antes:

> El equipo eligió la cola administrada, después de comparar tres opciones, porque permite conmutación regional.

Después:

> Después de comparar tres opciones, el equipo eligió la cola administrada porque permite conmutación regional.

Antes:

> La migración está programada para el viernes, y la condición importante es que antes debe aprobarse la prueba de restauración.

Después:

> La migración está programada para el viernes sólo si antes se aprueba la prueba de restauración.

## C9 sentence-variety

Varía la forma y la extensión de las oraciones cuando la repetición oculta relaciones o produce un ritmo mecánico. La variedad sirve al significado; no es una cuota.

### Señales

- muchas oraciones contiguas empiezan con el mismo sujeto y patrón verbal;
- todas tienen una extensión y un peso parecidos;
- varias oraciones breves ocultan causa, contraste o secuencia;
- una oración muy larga acumula relaciones que deberían explicitarse.

### Ejemplos

Antes:

> El proceso lee el mensaje. El proceso valida el token. El proceso guarda el resultado. El proceso confirma el mensaje.

Después:

> El proceso lee el mensaje, valida el token y guarda el resultado antes de confirmarlo.

Antes:

> La prueba pasó, el despliegue terminó, las personas usuarias seguían viendo datos viejos porque un nodo de caché no se reinició y el equipo quitó ese nodo de la rotación antes de que el tráfico volviera a la normalidad.

Después:

> La prueba pasó y el despliegue terminó, pero las personas usuarias seguían viendo datos viejos porque un nodo de caché no se reinició. El equipo quitó ese nodo de la rotación y el tráfico volvió a la normalidad.

## Reference completion check

Antes de devolver una mejora en español, confirma que:

- cada cambio pertenece a una sola familia `C`;
- la voz activa no inventó un actor;
- la forma positiva preservó prohibiciones, ausencias y contrastes;
- los términos concretos ya estaban respaldados;
- la concisión no eliminó reservas materiales;
- los cambios de orden conservaron referentes, tiempo, causa y condición;
- se mantuvo una variedad regional y un tratamiento coherentes;
- ningún cambio de claridad volvió a aparecer como hallazgo `H`.
