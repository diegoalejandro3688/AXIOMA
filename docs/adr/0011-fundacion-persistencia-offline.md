# ADR 0011 — Fundación de persistencia offline / client outbox

- **Estado**: Aprobada — validación automatizada principal (24 comprobaciones, incluyendo el caso 6b de `getMostRecent` agregado durante la verificación Android) ejecutada con `node:sqlite` contra la lógica real de producción (no una reimplementación), más una comprobación complementaria en navegador. **Verificación en dispositivo Android real completada y aprobada (2026-07-31, checklist más abajo, gate = PASS)**.
- **Fecha**: 2026-08-01
- **Fase de aplicación**: Fase 0 — Foundation, Paso 11 (último paso de implementación antes del Architecture Review 1.0)
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — ejecuta el Decision Gate de stack ya aprobado (expo-sqlite vs. WatermelonDB), sienta la base sobre la que Fase 1 construirá el protocolo de sincronización real.

## Contexto

**Este paso NO implementa sincronización cliente-servidor.** Se declara explícitamente aquí porque el nombre coloquial "sync offline" invita a esa lectura y el propio ADR debe prevenirla. La Implementation Matrix distingue dos niveles: Fase 0 dice "sync offline **básico**"; Fase 1 dice "sync offline" a secas, y el PRD ubica literalmente "Cola offline básica" dentro del alcance de la Vertical Slice M1 (Fase 1), junto con "registro de intentos" y "Progreso". Master Context 8.9 describe además un protocolo completo (IDs globales, cursores opacos, reconciliación de conflictos, resultados parciales) que no tiene sentido construir hoy: no existe ningún dominio (Progress/Education) contra el cual sincronizar, ni ningún endpoint de servidor que reciba estas operaciones.

Por acuerdo explícito del usuario, este paso se renombra de "Sync offline" a **"Fundación de persistencia offline / client outbox"** — nombre que describe con precisión lo que se construye: la infraestructura cliente de almacenamiento local (Decision Gate de stack: expo-sqlite + capa de repositorio propia, no WatermelonDB) y una cola local de intenciones, sin protocolo de sincronización real todavía.

## Decisión

### Arquitectura: driver SQLite agnóstico de proveedor

`SqliteDriver` (interfaz) + `sqlite-driver.expo.ts` (adaptador real para React Native). Toda la lógica de migraciones y del repositorio (`migration-runner.ts`, `outbox-repository.ts`) se escribe contra la interfaz, nunca contra `expo-sqlite` directamente — mismo patrón ya usado para `IdentityProvider` (AUTH) y `ObjectStorageService` (ADR-0010). Esto permitió, sin planearlo desde el inicio pero resultando decisivo, inyectar un adaptador de `node:sqlite` en el gate automatizado y probar la lógica **real** de producción contra SQLite real, sin pasar por el binding nativo.

**Hallazgo técnico durante la implementación**: `outbox-repository.ts` originalmente importaba `randomUUID` de `expo-crypto` directamente. Ese import arrastra módulos internos de React Native al grafo de dependencias, que `tsx`/esbuild no pueden transformar fuera del bundler de Expo (error `Unexpected "typeof"` al intentar ejecutar el gate). Se resolvió inyectando `generateId: () => string` por constructor -- `database.ts` (composition root real) pasa `randomUUID` de `expo-crypto`; el gate pasa `randomUUID` de `node:crypto`. Ninguna lógica compartida importa un módulo nativo de Expo/RN.

### Migraciones atómicas y monotónicas (ajustes 2, 3, 4, 6)

`PRAGMA user_version` de SQLite como versión de esquema (nativo, transaccional, sin tabla adicional). `runMigrations()`:

- Lee la versión actual; aplica solo las migraciones con `version >` la actual, en orden ascendente (monotónico).
- Cada migración corre dentro de `withTransactionAsync` -- si `up()` lanza, ROLLBACK y `PRAGMA user_version` **nunca** se actualiza para esa versión. Verificado con una migración que falla deliberadamente a mitad de camino: la versión queda en la anterior, no a medias.
- Si la versión almacenada es **mayor** que la última que la build conoce (una instalación más antigua de la app abre una base migrada por una versión más nueva), lanza `FutureSchemaVersionError` explícita en vez de intentar "desmigrar" o ignorar la diferencia. Verificado forzando `PRAGMA user_version = 999`.
- `PRAGMA user_version = ${version}` interpola el número directamente -- SQLite no admite parámetros enlazados en sentencias PRAGMA. Es la única excepción documentada a la regla de parámetros enlazados: `version` es un entero literal del propio código, nunca dato de usuario o de red.

### Esquema mínimo: `outbox_operation`

Cola local de **intenciones** (Master Context 8.9: "el cliente deberá enviar intenciones, no mutaciones definitivas"). Columnas: `id` (UUID, generado una sola vez, estable en reintentos), `operation_type`/`aggregate_type`/`aggregate_id`/`payload` (genéricos -- no hay todavía un dominio real que les dé forma concreta), `sync_status` (`CHECK` restringido a `PENDING|SYNCED|FAILED`), `retry_count`, `last_error`, `created_at`/`updated_at`. Índice `(sync_status, created_at)` para listar pendientes sin escanear la tabla completa.

### Payload limitado y validado (ajuste 5)

`MAX_PAYLOAD_BYTES` (32 KB) aplicado sobre el tamaño serializado (medido con `TextEncoder`, no `Buffer`, por portabilidad Hermes/Node). `serializePayload()` rechaza payloads no serializables (referencias circulares, `BigInt`) **antes** de tocar la base -- nunca se intenta un `INSERT` con un payload inválido.

### Parámetros enlazados en toda consulta variable

Verificado no solo por inspección: el gate inserta un valor que contiene sintaxis SQL (`"'); DROP TABLE outbox_operation; --"`) como dato de `payload`/`aggregate_type` y confirma que la tabla sigue existiendo y la fila se guardó como texto plano, nunca como código ejecutado.

### `retryCount` incrementa sin borrar la fila (ajuste 9)

`markFailed()` hace `UPDATE ... SET retry_count = retry_count + 1, sync_status = 'FAILED', last_error = ?` -- nunca `DELETE`. El `id` generado en `enqueue()` es el mismo durante toda la vida de la operación: reintentos sucesivos actualizan la misma fila, verificado explícitamente (dos llamadas a `markFailed` consecutivas, mismo `id`, `retryCount` en 1 y luego 2).

### Pantalla de diagnóstico solo-dev (ajuste 12, 13)

`app/dev-offline-diagnostics.tsx` -- guardada por `if (!__DEV__) return <Redirect href="/" />`, global estándar de React Native (`false` en cualquier build de producción/release). No enlazada desde ninguna pantalla de producto (Login, Tabs) -- alcanzable solo escribiendo la URL directamente en desarrollo, mismo criterio que `/platform/_internal/diagnostics` del backend (ADR-0007). Los payloads de prueba son datos inertes (`{ note: 'diagnóstico de desarrollo', createdAtMillis }`) -- nunca PII, tokens o secretos.

## Limitación del entorno (declarada explícitamente, no omitida)

Este entorno de desarrollo **no tiene SDK de Android ni emulador disponible** (sin `adb`, sin `ANDROID_HOME`). Por decisión explícita del usuario, la verificación en Android real se hizo en un dispositivo físico del usuario (Expo Go), fuera de este entorno:

- **Validación automatizada PRINCIPAL**: `node:sqlite` (Node 22+), ejecutando la lógica real de `migration-runner.ts`/`migrations.ts`/`outbox-repository.ts` -- no una reimplementación ni un mock -- contra SQLite real, incluyendo persistencia real en archivo (abrir, escribir, cerrar, reabrir el mismo archivo `.db`).
- **Comprobación complementaria en navegador** (`expo start --web`): la pantalla de diagnóstico **renderiza correctamente** (título, botones, accesibilidad), pero el peticion del *worker* de `expo-sqlite` para web (`expo-sqlite/web/worker.bundle`) **quedó pendiente sin completar** en la verificación realizada -- consistente con que el soporte web de `expo-sqlite` es alpha y probablemente depende de cabeceras de aislamiento de origen cruzado (`Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy`) que el servidor de desarrollo de Metro no envía por defecto. **No se afirma que la persistencia funcionó en web** -- se documenta el hallazgo tal como se observó, sin inventar un resultado.
- **Verificación en Android nativo real: completada (2026-07-31), resultado PASS.** Ver checklist ejecutado abajo.

### Checklist manual reproducible para Android — EJECUTADO, resultado PASS (2026-07-31)

1. Compilar y correr una build de desarrollo en un dispositivo/emulador Android real (`expo run:android` o EAS Build de desarrollo). — Ejecutado con Expo Go en dispositivo Android físico.
2. Navegar a `dev-offline-diagnostics` (solo alcanzable porque es una build de desarrollo, `__DEV__ === true`). — OK (el deep link directo no abrió la ruta en este dispositivo; se usó temporalmente un enlace visible desde Inicio, ya retirado tras el gate).
3. Pulsar "Encolar operación de prueba" -- confirmar que aparece en la lista de pendientes. — OK.
4. **Cerrar la app por completo** (no solo verla en segundo plano -- forzar el cierre desde el sistema operativo). — OK.
5. Reabrir la app y volver a `dev-offline-diagnostics`. — OK.
6. Confirmar que la operación encolada en el paso 3 **sigue apareciendo** (persistencia real en `expo-sqlite`, no en memoria). — OK, mismo id (`02539864-b8c3-4500-83e7-b7add78a6a52`).
7. Pulsar "Marcar última fallida" -- confirmar que `retryCount` pasa de 0 a 1 y la operación **no desaparece** de la lista. — OK tras diagnóstico de un hallazgo intermedio (ver abajo).
8. Repetir el cierre completo + reapertura una vez más -- confirmar que el `retryCount` y el estado `FAILED` **persisten** (no se resetean). — OK: tras cerrar y reabrir la app, la pantalla leyó `estado=FAILED`, `retryCount=1`, mismo id, directamente desde SQLite al abrir, sin pulsar ningún botón.
9. Confirmar, revisando el código fuente instalado, que la build es de desarrollo (`__DEV__`) y que intentar acceder a la misma ruta en una build de producción/release no ejecuta ninguna operación (redirige). — OK (guarda `if (!__DEV__) return <Redirect href="/" />` sin cambios).

**Hallazgo intermedio durante el paso 7 (ya resuelto):** en un primer intento, tras pulsar únicamente "Marcar última fallida", el estado leído quedó en `SYNCED` con `retryCount=1` en vez de `FAILED`. Se descartó un bug en `markFailed()` (el gate automatizado prueba que deja `retry_count` y `sync_status='FAILED'` en el mismo `UPDATE` atómico -- caso 6b). Se añadió `getMostRecent()` a `OutboxRepository` (la pantalla dependía de un id en `useState` que no sobrevive un reinicio y de `listPending()`, que solo filtra `PENDING`), y una guarda `busy` en la pantalla de diagnóstico que deshabilita los 4 botones mientras hay una operación en curso, para eliminar la posibilidad de una invocación superpuesta (p. ej. doble-tap) sobre la misma fila. Repetido el checklist completo con la pantalla corregida: resultado consistente y correcto (pasos 6-9 arriba).

## Decisiones futuras documentadas (no resueltas aquí)

- **Limpieza al cerrar sesión / eliminar cuenta**: Master Context 8.8 exige que cerrar sesión, eliminar cuenta o revocar una instalación limpie el material local correspondiente. Este paso **no** integra `OutboxRepository` con `MockAuthProvider.logout()` -- no hay todavía datos reales que limpiar (solo fixtures de diagnóstico, solo-dev). Se decide cuando Fase 1 introduzca operaciones reales en la cola.
- **Cifrado de la base local**: Master Context 8.8 prohíbe secretos de servidor/credenciales administrativas en almacenamiento local, pero no exige cifrado de toda la base para datos de progreso académico. Hoy `outbox_operation` no contiene nada sensible (fixtures de diagnóstico). Cuando contenga intentos/respuestas reales de estudiantes (Fase 1), se debe evaluar explícitamente si `expo-sqlite` necesita cifrado a nivel de archivo (ej. SQLCipher) -- **decisión pendiente, no tomada en este ADR**.

## Alternativas descartadas

- **WatermelonDB** -- descartada en el Decision Gate de stack original (2026-07-29); expo-sqlite + repositorio propio se reconsideraría solo si la complejidad de sincronización lo justifica más adelante. Nada en este paso cambia esa decisión.
- **Construir el protocolo completo de Master Context 8.9 ahora** (cursores, deduplicación servidor-cliente, conflictos) -- descartado: no existe backend ni dominio real contra el cual ejercitarlo; es trabajo de Fase 1.
- **Tabla `schema_migrations` propia** -- descartada a favor de `PRAGMA user_version`, mecanismo nativo de SQLite, transaccional, sin tabla ni columna adicional.
- **Verificar Android simulando el resultado** -- descartado explícitamente por el usuario: se documenta la limitación real del entorno y se deja un checklist reproducible en vez de afirmar una verificación que no ocurrió.

## Consecuencias

- Fase 1, al construir el protocolo de sincronización real, consumirá `OutboxRepository.listPending()` y llamará `markSynced`/`markFailed` según la respuesta de un endpoint de servidor que todavía no existe -- ese endpoint, su forma de aceptación/conflicto/reintento, y la reconciliación de estado, son trabajo de ese paso, no de este.
- Antes de que la cola contenga datos reales de estudiantes, quedan dos decisiones explícitamente pendientes: limpieza al cerrar sesión/eliminar cuenta, y necesidad de cifrado a nivel de archivo.
- La verificación en Android real (checklist arriba) está completa -- gate = PASS (2026-07-31).
- El soporte web de `expo-sqlite` mostró una limitación real (worker que no completa su carga) -- si en el futuro se necesita que la app funcione en web con persistencia local, hay que investigar la configuración de cabeceras de aislamiento de origen cruzado en el servidor de Metro; no es necesario para este paso (web es plataforma complementaria, no el objetivo de producto).

## Validación

- **Principal (automatizada, `node:sqlite`)**: 24 comprobaciones, incluyendo migración inicial (tabla + CHECK + índice), monotonicidad, atomicidad ante fallo (con ROLLBACK real), rechazo controlado de versión futura, estabilidad de `id` en reintentos, `retryCount` incremental sin borrado, `listPending` filtra correctamente, `getMostRecent` no filtra por estado (caso 6b, agregado durante la verificación Android), rechazo de payload circular y de payload sobre el límite de tamaño, persistencia real entre apertura/cierre de archivo, y resistencia a un payload con sintaxis SQL (parámetros enlazados).
- **Complementaria (Browser tool, web)**: la pantalla de diagnóstico renderiza correctamente; la persistencia real vía `expo-sqlite` web quedó sin confirmar (ver limitación del entorno arriba).
- **Android real (Expo Go, dispositivo físico)**: PASS (2026-07-31) -- ver checklist ejecutado arriba.
- `pnpm -r run typecheck/lint` en verde (incluye `apps/mobile/scripts/`).
- CI: nuevo job `offline-outbox-gate` (Node 22, requerido por `node:sqlite`, separado del job `build` que sigue en Node 20).

**Gate Android: PASS. Sin pendientes bloqueantes para el cierre de Fase 0 en este ADR.**

**Nota de cierre posterior (Bloque V, 2026-08-03)**: este gate validó la mecánica genérica de la cola (fixture de diagnóstico) porque en Fase 0 todavía no existía ningún flujo de dominio real que la usara. El primer consumidor real (`submit_response`, ADR-0014) quedó con su propia verificación nativa de punta a punta pendiente hasta Bloque V -- ver ADR-0014, "Cierre del pendiente" y `docs/BLOCK-V-OFFLINE-E2E-PROTOCOL.md` (PASS, incluyendo idempotencia explícita).
