# Architecture Review 1.0 — ADR-0001 a ADR-0011

- **Fecha**: 2026-08-01
- **Alcance**: revisión conjunta de todos los ADR de Fase 0 (ADR-0001 a ADR-0011), verificando terminología consistente, nombres consistentes, mismos principios, mismas decisiones, ausencia de contradicciones entre ADR, y mismos conceptos de dominio — criterio fijado explícitamente por el usuario antes de empezar Fase 0.
- **Responsable**: Product Owner (usuario), ejecutada por Claude Code.
- **Resultado**: 2 hallazgos materiales encontrados y corregidos en los propios ADR afectados (no en este documento aparte). 1 hallazgo cosmético observado, no corregido (ver "Hallazgos menores, no corregidos"). Gate final consolidado re-ejecutado sin regresiones (ver "Gate final consolidado").
- **Pendiente que este review NO resuelve** (resuelto después, ver "Cierre de Fase 0" abajo): verificación manual en Android real (ver ADR-0011) — requería un dispositivo/emulador que este entorno no tiene disponible.

## Hallazgos materiales encontrados y corregidos

### 1. Deriva numérica en los conteos de "N comprobaciones" (ADR-0004, 0006, 0007, 0008, 0010, 0011)

**Qué se encontró**: cada ADR desde el 0004 en adelante cita un número de comprobaciones del gate correspondiente ("gate completo verificado (N comprobaciones)"). Al recontar contra la ejecución real de los scripts (`scripts/verify-*.ts`), varios números no coincidían:

| Gate | Citado originalmente | Real (re-ejecución de esta review) |
|---|---|---|
| AUTH (ADR-0004) | 24 (contradecía además el "19" que citaban ADR-0005 en adelante) | **19** |
| PRIVACY (ADR-0005) | 34 | 34 (correcto, sin cambio) |
| ANALYTICS (ADR-0006) | 34 | **38** |
| OBSERVABILITY (ADR-0007) | 43 | **44** |
| USER (ADR-0008) | 33 | **40** |
| OBJECT-STORAGE (ADR-0010) | 21 | **22** |
| OFFLINE-OUTBOX (ADR-0011, node:sqlite) | 21 | **22** |

**Por qué importa**: ADR-0004 y ADR-0005 ya se contradecían entre sí en el número del propio gate de AUTH (24 vs. 19) — una inconsistencia real detectable con solo leer ambos documentos, sin necesitar ejecutar nada. Los demás conteos habían quedado desactualizados a medida que cada gate creció (se agregaron comprobaciones en pasos posteriores sin volver a contar hacia atrás).

**Corrección aplicada**: se re-ejecutaron los 7 gates (6 backend + 1 mobile) contra infraestructura efímera desde cero como parte de esta review (ver "Gate final consolidado" abajo), y se corrigieron los números en los ADR afectados para que coincidan con la ejecución real, dejando una nota explícita de la corrección en cada uno (línea de "Estado" y encabezado de "Validación").

### 2. Referencia incorrecta a "la cola offline ya existente" (ADR-0002)

**Qué se encontró**: ADR-0002 (Paso 2, redactado antes de que existiera cualquier mecanismo offline) afirmaba que el SVG de las fórmulas "se cachea junto con el resto de la pregunta en la cola offline ya existente". En el momento de escribir ADR-0002 no existía ningún mecanismo offline. Y una vez construido (ADR-0011, Paso 11), el mecanismo real es una **cola de intenciones salientes** (respuestas del estudiante pendientes de enviar al servidor) — no una **caché de contenido entrante** para lectura sin conexión, que es lo que ADR-0002 en realidad necesitaría. Son dos conceptos distintos que la frase original conflacionaba.

**Por qué importa**: es exactamente el tipo de contradicción entre ADR que este review existe para detectar — un documento haciendo una afirmación sobre un mecanismo que (a) no existía cuando se escribió y (b) sigue sin ser el mecanismo correcto incluso ahora que algo con ese nombre existe.

**Corrección aplicada**: se corrigió la frase en ADR-0002 para describir correctamente que la descarga/caché de contenido para uso offline sigue sin construirse (Master Context 8.8, "recursos descargados"), y se dejó una nota explícita distinguiendo ambos mecanismos, con referencia cruzada a ADR-0011.

## Hallazgos menores, no corregidos

### 3. Variación estilística en la línea "Estado"

Se observó que la línea `**Estado**` usa tres formas distintas a lo largo de la serie: `Aprobada` (ADR-0001), `**Aprobada formalmente**` (ADR-0002/0003/0004), y `Aprobada, con N ajustes... incorporados` (ADR-0005 en adelante). El contenido sustantivo de cada una es correcto y no contradictorio — es una variación de estilo de redacción a medida que el propio proceso de trabajo maduró (los ajustes obligatorios del usuario se volvieron una parte más explícita del flujo desde ADR-0005). Se decide **no** reescribir retroactivamente las líneas de Estado de ADR-0001 a 0004 para unificar la fórmula exacta: hacerlo no corrige ninguna afirmación incorrecta, solo homogeneiza prosa, y editar ADRs ya cerrados solo por estilo tiene más riesgo (introducir un error al editar) que beneficio. Documentado aquí para que quede como decisión consciente, no como omisión.

## Verificado sin hallazgos (consistente en toda la serie)

- **Nombres de dominio**: AUTH, PRIVACY, ANALYTICS, USER, EDUCATION (y OBJECT-STORAGE/OBSERVABILITY como infraestructura de plataforma, no dominios de negocio) se usan consistentemente en mayúsculas al referirse al dominio canónico del Master Context, en los 11 ADR.
- **Reglas de dependencia entre dominios** (Master Context 6.21): ningún ADR hace que AUTH dependa de PRIVACY/ANALYTICS/USER; USER depende de AUTH (no al revés); PRIVACY coordina sin apropiarse de tablas ajenas — consistente desde ADR-0004 hasta ADR-0008.
- **Patrón "repositorio por agregado, no por dominio completo"**: fijado en ADR-0003, respetado sin excepciones hasta ADR-0011 (`OutboxEventRepository`, `AnalyticsEventRepository`, `UserProfileRepository`, etc., cada uno dueño de una sola tabla).
- **Patrón Outbox, servidor y cliente**: ADR-0006 (servidor, `outbox_event` → consumido por ANALYTICS) y ADR-0011 (cliente, `outbox_operation` → cola de intenciones salientes) son mecanismos análogos pero explícitamente distintos, cada uno documentado como tal — no hay confusión de nombres a pesar de compartir la palabra "outbox".
- **Terminología `correlationId`/`requestId`**: ADR-0007 y ADR-0009 usan ambos términos de forma intencional y ya explicada (`correlationId` es el concepto interno; `requestId`/`X-Request-Id` es su manifestación HTTP) — no es una inconsistencia, es la terminología en capas tal como se diseñó.
- **Nivel de decisión** (protocolo Master Context 11.9): usado consistentemente (Nivel 2 en casi todos, Nivel 2/3 explícito en ADR-0004 con justificación) — ningún ADR omite esta línea.
- **Principio de necesidad / alcance mínimo**: invocado explícitamente y aplicado de forma consistente en los 11 ADR — ninguno construye una entidad/mecanismo del Data Model completo antes de que un dominio real lo necesite (ej. `analytics_actor` completo, `public_profile`, cifrado de la cola offline — todos explícitamente diferidos con la misma justificación).
- **Ningún ADR contradice una decisión activa de otro**: no se encontró ningún caso de un ADR posterior deshaciendo silenciosamente una decisión previa sin decirlo — los cambios de diseño respecto a una versión anterior del mismo ADR (ej. ADR-0005 "ajuste 1", ADR-0006 "hallazgo técnico") están documentados como tales, no como hechos nuevos sin origen.

## Gate final consolidado (re-ejecutado como parte de esta review)

Ejecutado contra infraestructura efímera desde cero (Postgres y MinIO nuevos, sin datos previos), migraciones aplicadas desde cero (6 migraciones, sin cambios desde ADR-0008), 6 instancias del backend en puertos separados + 1 ejecución del gate del cliente móvil:

| Gate | Resultado | Comprobaciones |
|---|---|---|
| AUTH | ✅ Todas pasaron | 19 |
| PRIVACY | ✅ Todas pasaron | 34 |
| ANALYTICS | ✅ Todas pasaron | 38 |
| OBSERVABILITY | ✅ Todas pasaron | 44 |
| USER | ✅ Todas pasaron | 40 |
| OBJECT-STORAGE | ✅ Todas pasaron | 22 |
| OFFLINE-OUTBOX (`node:sqlite`, mobile) | ✅ Todas pasaron | 22 |
| **Total** | **Sin regresiones** | **219** |

`pnpm -r run typecheck`, `pnpm -r run lint`, y build de los 3 paquetes: verde.

## Estado de cierre de Fase 0

**Fase 0 NO se cierra formalmente con este documento.** Por decisión explícita del usuario, el cierre requiere, en orden:

1. ✅ Architecture Review 1.0 (este documento).
2. ✅ Resolución de hallazgos materiales (ver arriba).
3. ✅ **Checklist manual de verificación en Android real (ADR-0011)** — ejecutado en dispositivo Android físico (Expo Go), 2026-07-31. Resultado: PASS. Ver checklist completo y hallazgo intermedio (corregido) en ADR-0011.
4. ✅ Gate final consolidado re-ejecutado (ver arriba; el gate OFFLINE-OUTBOX pasó de 22 a 24 comprobaciones tras agregar el caso 6b de `getMostRecent` durante la corrección del hallazgo intermedio del punto 3).
5. ✅ Commit/tag formal de cierre de Fase 0 — commit `ba64e90`, tag `phase-0-complete`.

## Cierre de Fase 0

**Fase 0 queda cerrada formalmente el 2026-07-31.** Los 11 pasos de la Implementation Matrix, sus 11 ADR, el Architecture Review 1.0 y el gate Android quedan todos en estado aprobado, sin pendientes bloqueantes. Las decisiones futuras explícitamente diferidas (limpieza de la cola offline al cerrar sesión, cifrado a nivel de archivo, protocolo real de sincronización, entre otras documentadas en cada ADR) quedan abiertas para Fase 1 (Vertical Slice M1), no para Fase 0.
