# Block V Closure Report — Refinamiento y Preparación

**Fecha de cierre**: 2026-08-03
**Fase**: Fase 1 — Vertical Slice M1
**Bloque**: V de V (Roadmap AXIOMA Phase 1 Kickoff, §7.5)
**Documentos relacionados**: `docs/adr/0007-logging-error-handling.md` (nota histórica), `docs/adr/0010-almacenamiento-de-contenido.md` (nota histórica), `docs/adr/0011-fundacion-persistencia-offline.md` (cierre de pendiente), `docs/adr/0014-progress-foundation.md` (cierre de pendiente), `docs/BLOCK-V-OFFLINE-E2E-PROTOCOL.md`, `scripts/verify-block-v-gate.mjs`
**Estado final**: **APPROVED**

## 1. Objetivo del bloque

Último bloque de la Vertical Slice M1. Según el Kickoff (§7.5): *"Mejorar la experiencia obtenida durante las pruebas de la Vertical Slice, corregir problemas detectados y preparar la arquitectura para la siguiente etapa del producto."* Resultado esperado: *"Una Vertical Slice estable, validada y preparada para servir como base del crecimiento futuro."*

Explícitamente **no** es un bloque de dominio nuevo ni de funcionalidad ampliada — el alcance se acotó deliberadamente a cerrar deuda técnica real y pulir lo ya construido en los Bloques I–IV, sin tocar Competir, IA, gamificación funcional, Práctica libre/Ensayo/Recursos independientes, perfil avanzado, ni ningún dominio de recomendaciones.

## 2. Trabajo realizado

- **Verificación offline E2E nativa en Android físico** (punto bloqueante, obligatorio antes del resto del bloque) — protocolo de 17 pasos (`docs/BLOCK-V-OFFLINE-E2E-PROTOCOL.md`), incluyendo verificación explícita de idempotencia. **PASS**, cierra el pendiente abierto desde ADR-0011 y nunca antes ejercitado de punta a punta en dispositivo real (ver ADR-0011/ADR-0014, "Cierre del pendiente").
- **Barrido de pendientes documentales** sobre ADR-0001–0015: 5 Decision Gates ya documentados (integración Firebase real, advisory lock multi-réplica, carga de imágenes de perfil, almacenamiento seguro de credenciales, aprovisionamiento de bucket R2) confirmados como correctamente diferidos a Fase 2, ninguno bloqueaba el cierre de M1.
- **Normalización de copy** en estados de carga/vacío/error ya existentes (Inicio, Estudio, Recurso, Ejercicio, Perfil, auth) — un solo caso genérico real encontrado y corregido (loading de Inicio); el resto ya había quedado específico desde Bloque IV.
- **Verificación de comportamiento mobile** (tema del sistema cambiando con la app en segundo/primer plano) — confirmado por diseño (`Appearance.addChangeListener` de React Native), sin defecto encontrado, sin código nuevo.
- **Gate consolidado** (`scripts/verify-block-v-gate.mjs`, `pnpm run verify:block-v-gate`): orquestador que reproduce la secuencia de `.github/workflows/ci.yml` (migraciones → seed → AUTH → PRIVACY → ANALYTICS → OBSERVABILITY → USER → OBJECT-STORAGE → seed de contenido → EDUCATION → PROGRESS → OFFLINE-OUTBOX, más typecheck/lint/build) invocando los gates individuales ya existentes sin reimplementar su lógica — estos se conservan intactos para diagnóstico puntual.
- **Decisión Gate cerrada explícitamente**: theming completo de Competir/IA/Perfil/auth (inputs, botones, bordes) **no** se hizo en este bloque — no pasa la regla de imprescindibilidad del Kickoff (§5.3) porque esas pantallas no son parte del recorrido de aprendizaje. Queda documentado como deuda aceptada, diferida a Fase 2, no como un olvido.
- **Contradicción detectada y corregida durante la propuesta de alcance**: una mención a un dominio "Recommendation" se coló en una versión temprana de la propuesta de Bloque V. Contrastada contra el Kickoff (que excluye explícitamente "recomendaciones mediante IA" de toda M1, §5.2) y el roadmap oficial (que no define ese dominio en ningún bloque), se descartó antes de escribir una sola línea de código.

## 3. Principales incidencias encontradas durante la validación, causa raíz y resolución

Todas las incidencias de esta sección fueron del **orquestador de verificación** (`scripts/verify-block-v-gate.mjs`, construido en este mismo bloque) — ninguna fue un defecto real en el logger, el gate de OBJECT-STORAGE, `ObjectStorageService`, ni ningún otro código de dominio. Se listan en el orden en que se descubrieron, cada una con su propia evidencia:

| # | Incidencia | Causa raíz | Resolución |
|---|---|---|---|
| 1 | `typecheck` fallaba de inmediato sin ningún error real de TypeScript (`status: null`) | `ROOT` se calculaba con `new URL('..', import.meta.url).pathname`, que nunca decodifica el porcentaje-escapado de la URL — con un espacio en la ruta ("usuario 4"), quedaba literalmente "usuario%204", apuntando `cwd` a un directorio inexistente | `fileURLToPath()` en vez de `.pathname` manual |
| 2 | `pnpm`/`npx` fallaban al invocarse desde Windows | Son shims `.cmd`; `spawn`/`spawnSync` sin `shell: true` no puede ejecutarlos directamente | `shell: true` condicionado a `process.platform === 'win32'`, aplicado a las invocaciones de `pnpm`/`npx` |
| 3 | `OBSERVABILITY gate` fallaba con `ENOENT` sobre `backend-observability.log` | El orquestador solo acumulaba la salida del backend en memoria; nunca la escribía a un archivo real, a diferencia de la redirección de shell (`> archivo 2>&1`) que usa CI | `startBackend()` acepta un `logFile` opcional y escribe stdout+stderr también a un archivo real con `createWriteStream`, en ruta siempre absoluta |
| 4 | `AUTH gate` fallaba a mitad de ejecución con `ECONNRESET` | El mismo fix de portabilidad (punto 2) se había aplicado también a `spawn('node', ...)` — pero `node` es un ejecutable real, no un shim; envolverlo en `cmd.exe` agrega una capa que, con un hijo de larga duración escribiendo stdout/stderr bajo carga, causa cierres de pipe intermitentes en Windows y además rompe `child.kill()` (mata el `cmd.exe`, no necesariamente el `node` real) | `shell` retirado específicamente del `spawn` del backend, mantenido solo donde de verdad hace falta (`pnpm`/`npx`) |
| 5 | Sospecha de que `backend-observability.log` acumulaba datos de ejecuciones anteriores | Riesgo real dado el punto 4: un backend huérfano de una corrida interrumpida podía seguir vivo y escribiendo al archivo | `rmSync(path, {force:true})` explícito antes de arrancar cada backend con `logFile`, en vez de confiar solo en el truncado al abrir |
| 6 | `OBSERVABILITY gate` seguía fallando casi todas sus comprobaciones dependientes de log (redacción, correlación, clasificación warn/error) | **Causa real, confirmada con el archivo de log real**: `runBackendGate()` invocaba el script del gate con `spawnSync`, que bloquea el *event loop* del propio orquestador — mientras el gate corría (varios segundos de peticiones HTTP), nadie podía drenar el pipe de stdout/stderr del backend, así que ninguna línea posterior al arranque llegaba al archivo. Confirmado leyendo `backend-observability.log`: terminaba exactamente en "Nest application successfully started" | Invocación del script del gate cambiada a `spawn` asíncrono, esperado con una `Promise` sobre su evento `close` — mantiene el *event loop* libre |
| 7 | `OBJECT-STORAGE gate` fallaba con `SignatureDoesNotMatch` de MinIO en el escenario válido completo | El *fallback* del orquestador para `OBJECT_STORAGE_SECRET_ACCESS_KEY` (`axioma_local_password`) nunca coincidió con `MINIO_ROOT_PASSWORD` real de `docker-compose.yml` (`axioma_dev_password`) — confirmado comparando ambos archivos directamente, no por hipótesis | Fallback corregido a `'axioma_dev_password'`, manteniendo prioridad para cualquier valor explícito del entorno |

**Endurecimiento preventivo, no atado a una causa confirmada**: `NODE_ENV`/`LOG_LEVEL` se fijan explícitamente (`development`/`log`) en vez de heredarse de `process.env` — evita que un valor ambiental de la máquina local (ej. `NODE_ENV=production` de otro proyecto) bloquee silenciosamente los endpoints de diagnóstico o descarte logs de nivel `log`. Se aplicó como medida de higiene aunque la incidencia #6 resultó tener una causa distinta.

## 4. Evidencia de validación (2026-08-03)

`pnpm run verify:block-v-gate` — **PASS completo**, 16/16 pasos:

| Paso | Resultado |
|---|---|
| typecheck | **PASS** |
| lint | **PASS** |
| build contracts | **PASS** |
| build backend | **PASS** |
| prisma generate | **PASS** |
| prisma migrate deploy | **PASS** |
| prisma seed | **PASS** |
| AUTH gate | **PASS** |
| PRIVACY gate | **PASS** |
| ANALYTICS gate | **PASS** |
| OBSERVABILITY gate | **PASS** |
| USER gate | **PASS** |
| OBJECT-STORAGE gate | **PASS** |
| EDUCATION gate | **PASS** |
| PROGRESS gate | **PASS** |
| OFFLINE-OUTBOX gate | **PASS** |

Más, por separado: verificación offline E2E nativa en Android físico — **PASS** (protocolo de 17 pasos, incluyendo idempotencia explícita, ver `docs/BLOCK-V-OFFLINE-E2E-PROTOCOL.md`).

Instrumentación de depuración temporal (capturas de log ad hoc, comentarios de "investigación en curso" atados a las incidencias #3/#7 de la tabla anterior): retirada del orquestador una vez confirmada cada causa raíz — verificado que no quedan `TODO`/`FIXME`/marcadores temporales en `scripts/verify-block-v-gate.mjs`. Las mejoras de diagnóstico de uso permanente (distinción clara de causa de fallo, reporte de variables de entorno sin exponer secretos) se conservaron por ser de valor general, no atadas a una incidencia específica ya cerrada.

## 5. Estado final

**APPROVED.** Bloque V — Refinamiento y Preparación queda cerrado. Con esto, la **Vertical Slice M1 completa** (Bloques I–V) queda implementada, validada y sin pendientes bloqueantes: un estudiante puede completar una sesión de estudio real de principio a fin usando exclusivamente Axioma, en modo claro u oscuro, online y offline, con la infraestructura de calidad (gates, tipos, lint, build) verificada de forma consolidada y reproducible.

## 6. Lecciones aprendidas

- **Un orquestador de procesos en Windows necesita reglas distintas por tipo de binario**: aplicar `shell: true` de forma uniforme "porque en algún caso hace falta" fue exactamente lo que rompió el `spawn` del backend (incidencia #4) — los shims `.cmd` (`pnpm`, `npx`) lo necesitan; los ejecutables reales (`node`) no, y envolverlos igual introduce una capa de proceso con efectos secundarios reales.
- **`spawnSync` no es gratis cuando hay un proceso hermano con pipes activos**: la incidencia #6 (la más costosa de diagnosticar) no era un bug de dominio ni de Windows — era que bloquear el *event loop* del orquestador le impedía seguir drenando stdout/stderr de un proceso *concurrente*. Cualquier orquestador futuro que combine un proceso de larga duración (servidor) con comandos síncronos debe considerar esto desde el diseño, no descubrirlo en producción.
- **Comparar contra la fuente de verdad resuelve en minutos lo que la especulación no resuelve en horas**: la incidencia #7 se cerró leyendo `docker-compose.yml` directamente contra el fallback del orquestador — un diff de dos strings. Antes de eso, varias hipótesis basadas en inspección de código (aunque razonables) no habían llegado a nada porque el defecto no estaba en el código inspeccionado, sino en un valor de configuración externo a él.
- **Pedir evidencia antes de modificar código evitó cambios innecesarios**: en dos ocasiones (incidencia #6 y #7) la hipótesis inicial más plausible por inspección de código resultó incorrecta o incompleta; solo el log real y la comparación directa contra `docker-compose.yml` revelaron la causa exacta. Ningún archivo de dominio (`StructuredLogger`, `ObjectStorageService`, los gates individuales) terminó necesitando cambios.
- **Contrastar una propuesta contra el documento oficial antes de implementar sigue pagando dividendos**: la mención a "Recommendation" que se coló en la propuesta de alcance se descartó en la fase de revisión, no a mitad de implementación — exactamente el propósito del proceso de propuesta → revisión crítica → Decision Gates que se ha seguido en los cinco bloques de esta fase.

---

**Bloque V -- Refinamiento y Preparación: implementado, validado y cerrado (2026-08-03).**
**Vertical Slice M1 (Bloques I-V): completa.**
