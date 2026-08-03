# Bloque V — Protocolo de verificación offline E2E nativa (Android físico)

**Punto bloqueante de Bloque V** (Refinamiento y Preparación). Cierra el pendiente abierto desde ADR-0011 y nunca ejercitado de punta a punta en un dispositivo físico (ADR-0011/ADR-0014 lo dejaron explícitamente como "no bloqueante" por falta de SDK de Android en el entorno de implementación).

## Por qué la idempotencia ya está garantizada por diseño (revisión de código previa a la prueba)

Antes de la prueba física, confirmé por lectura de código que la idempotencia no depende de que el dispositivo "se porte bien" — está reforzada en 3 capas independientes:

1. **Cliente — `operationId` estable**: `OutboxRepository.enqueue()` (`lib/offline/outbox-repository.ts`) genera el `id` **una sola vez**, en el momento de encolar. Cada reintento posterior (`flushOperation`, disparado por `AppState`, montaje de Ejercicio, o "Reintentar") reutiliza ese mismo `id` como `operationId` — nunca se genera uno nuevo para la misma respuesta.
2. **Cliente — exclusión de operaciones ya sincronizadas**: `listPending()` filtra por `sync_status = 'PENDING'`. En cuanto una operación pasa a `SYNCED`, ningún disparador futuro vuelve a intentarla — un segundo drenado es un no-op real, ni siquiera genera una segunda petición HTTP.
3. **Servidor — `operationId` como clave de idempotencia de transporte** (`ProgressService.submitResponse`, ADR-0014 punto 4): busca primero por `operationId`; si ya existe, devuelve la fila existente sin crear nada. Reforzado además por unicidad real en Postgres sobre `(accountId, questionVersionId)` — ya verificado por el gate automatizado de ADR-0014 (34 aserciones, incluyendo envíos concurrentes).

Lo que la prueba física necesita confirmar es que este diseño se comporta igual en condiciones reales (app en segundo plano, red cortada de verdad, SQLite nativo) — no que exista una idempotencia que hoy no está garantizada.

## Protocolo

### Preparación
1. Build de desarrollo instalado en el dispositivo, Metro corriendo, backend real accesible por la IP de la red local (`.env` con la IP correcta — ver hallazgo ya corregido en Bloque IV).
2. Iniciar sesión con una cuenta de prueba, navegar a una unidad con al menos 2 preguntas sin responder.
3. Abrir `axioma://dev-offline-diagnostics` (o navegar a esa ruta desde un enlace de desarrollo) en una segunda pestaña/ventana si el dispositivo lo permite, o alternar entre esa pantalla y Ejercicio — es la pantalla de diagnóstico ya existente (`app/dev-offline-diagnostics.tsx`, solo `__DEV__`) que muestra la cola SQLite real, sin necesidad de herramientas externas.

### Paso 1 — Responder sin red
4. Activar **modo avión**.
5. Responder la primera pregunta.
6. **Verificar en la UI de Ejercicio**: aparece "Guardada localmente -- pendiente de sincronizar" (`isCorrect` desconocido, no se muestra Correcto/Incorrecto todavía).
7. **Verificar en Diagnóstico**: exactamente **una** operación en "Pendientes", `syncStatus = PENDING`, `retryCount = 0`. Anotar el `id` (primeros 8 caracteres).

### Paso 2 — Recuperar red y sincronizar
8. Desactivar modo avión, esperar a que haya conectividad real (confirmar en el propio dispositivo, no asumir).
9. Disparar la sincronización de la forma prevista por el diseño (elegir una, sin forzar nada fuera de los disparadores documentados en ADR-0014): llevar la app a segundo plano y volver a traerla a primer plano (`AppState` → `active`), **o** salir de Ejercicio y volver a entrar (montaje de pantalla).
10. **Verificar en la UI de Ejercicio**: la pregunta ya muestra el resultado real (Correcto/Incorrecto + explicación), no el estado "pendiente".
11. **Verificar en Diagnóstico**: la operación con el mismo `id` del paso 7 ahora aparece como "Última operación" con `syncStatus = SYNCED`. La lista de "Pendientes" queda vacía (o solo con operaciones de otras preguntas, si las hubiera).

### Paso 3 — Verificación explícita de idempotencia (obligatoria)
12. Repetir el disparador de sincronización **una segunda vez** (backgrounding/foreground de nuevo, o volver a entrar a Ejercicio) sin haber respondido nada nuevo.
13. **Verificar en Diagnóstico**: la operación sigue teniendo el **mismo `id`** que en el paso 7/11, `retryCount` sin cambios, y no aparece una segunda fila para la misma pregunta en ningún lado de la pantalla de diagnóstico — confirma que el cliente nunca reintenta una operación ya `SYNCED` (capa 2 de la garantía de diseño).
14. **Verificar el estado de la unidad**: reabrir la unidad desde Estudio → Unidades. El estado (En progreso/Completada) debe reflejar exactamente una respuesta registrada para esa pregunta — no debe verse ningún efecto de "doble conteo" (ej. si era la última pregunta, la unidad debe pasar a "Completada" una sola vez, sin necesitar responder de nuevo).
15. Si tienes acceso a la base de datos del backend o a un cliente HTTP contra `GET /progress/topics/:topicId` con la sesión de la cuenta de prueba: confirmar que `responses[]` contiene **exactamente una** entrada para ese `questionVersionId` — es la confirmación más directa de que el servidor nunca creó una segunda fila (capa 3 de la garantía de diseño). Este paso es deseable pero no bloqueante si no tienes ese acceso — los pasos 12-14 ya dan evidencia suficiente desde el propio cliente.

### Paso 4 — Caso de cierre completo de unidad (si aplica)
16. Si la unidad tiene más preguntas sin responder, repetir los pasos 1-2 para la(s) restante(s), terminando con la última pregunta.
17. Confirmar que, al responder la última pregunta y sincronizar, la unidad pasa a "Unidad completada" (pantalla Ejercicio) exactamente una vez, sin flashes ni reversiones a un estado anterior.

## Resultado esperado

**PASS** si los 17 pasos se cumplen sin desviaciones, en particular el paso 13 (ninguna operación duplicada tras un segundo disparador de sincronización) y el paso 14/15 (ninguna duplicación de progreso en el servidor).

**Si falla** cualquier paso: se documenta el paso exacto, el estado observado en Diagnóstico/UI, y se corrige antes de continuar con el resto de Bloque V — es el punto bloqueante acordado.

## Registro del resultado

**PASS — 2026-08-03, Android físico (Expo Go).**

- Respondida una pregunta con modo avión activado → "Guardada localmente -- pendiente de sincronizar" mostrado correctamente.
- Al recuperar conexión, sincronización automática exitosa -- resultado real reflejado (correcto/incorrecto, progreso actualizado, unidad completada).
- Reinicio de la app con conexión: progreso exactamente igual, sin pérdida ni alteración.
- Verificación de idempotencia (paso 12-14): sin duplicados ni doble conteo tras un segundo disparador de sincronización.

Sin hallazgos ni desviaciones respecto al diseño aprobado. Referenciado desde ADR-0011 (nota de cierre posterior) y ADR-0014 (punto 17 del gate, "Cierre del pendiente"). El pendiente abierto desde ADR-0011 queda formalmente cerrado.
