# Bloque VI — Definición Formal: Tutor IA

**Fecha**: 2026-08-11
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: VI de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/0022-proveedor-ia-tutor.md` (proveedor/modelo, congelado), `docs/adr/0005-privacy-foundation.md`, `docs/adr/0006-analytics-foundation.md`, `docs/adr/0007-logging-error-handling.md`, `docs/adr/0010-almacenamiento-de-contenido.md`, `docs/adr/0004-identity-authentication-foundation.md`, `docs/adr/LEF-BLOCK-V-DEFINITION.md`/`LEF-BLOCK-V-CLOSURE-REPORT.md` (bloque anterior, sin dependencias funcionales directas), PRD §7.5.9/§8.8/§12.14/§23.13, Master Context §4.11/§5.14 (CUJ-10)/§P-09, Data Model Bloque 15 (§15.1-15.46)
**Estado**: **EN DEFINICIÓN — pendiente de autorización del Product Owner para iniciar implementación.** Sin código todavía. Las decisiones de alcance/producto (§5) ya están cerradas por el Product Owner (2026-08-11); lo pendiente es la autorización explícita para comenzar el Incremento 1.

**Nota de nomenclatura**: a diferencia de los Bloques II-V de esta fase, **no existe colisión** con el roadmap anterior (Fase 1 — Vertical Slice M1) — ese roadmap solo llegó hasta "Bloque V de V" (`docs/adr/BLOCK-V-CLOSURE-REPORT.md`), nunca definió un "Bloque VI". Este documento usa el prefijo `LEF-` de todos modos, por consistencia con `LEF-BLOCK-II-DEFINITION.md`...`LEF-BLOCK-V-DEFINITION.md` — mismo criterio de nomenclatura hacia adelante, no porque exista una colisión real esta vez.

**Nota de reconciliación de numeración** (repetida aquí, exigida por `LEF-BLOCK-V-DEFINITION.md` §"Nota de reconciliación de numeración", que anticipó esta obligación): `docs/adr/0022-proveedor-ia-tutor.md` (línea 5) menciona *"el futuro Bloque V ('Tutor IA: Fundación')"* — registro histórico, **byte-idéntico a su versión aprobada, sin modificar**. Toda mención a "Bloque V" en ADR-0022 debe leerse, hacia adelante, como referencia anticipada a este documento (**LEF Bloque VI — Tutor IA**). Esta definición ocupa el número VI de forma definitiva. ADR-0022 permanece intacto — la reconciliación vive únicamente en notas como esta.

---

## 1. Estado

Ver línea "Estado" arriba. Auditoría documental completa (informe previo de esta misma conversación) y decisiones A-Q del Product Owner (2026-08-11, ver §5) ya incorporadas a este documento. Sin código, sin SDK instalado, sin migraciones — confirmado por auditoría directa del repositorio antes de escribir este documento.

## 2. Objetivo del bloque

Dar al estudiante un asistente educativo conversacional — acompañamiento pedagógico contextual, nunca autoridad académica — construido sobre Anthropic/`claude-sonnet-5` (ADR-0022, ya cerrado), con cuotas y turnos gobernados, degradación segura ante fallos del proveedor, minimización estricta de datos personales y académicos enviados al proveedor, y protección determinista de actividades evaluativas — sin introducir la totalidad del dominio candidato de Data Model Bloque 15 (~20 entidades) de una sola vez, siguiendo el mismo principio de mínima persistencia nueva ya aplicado en los seis bloques anteriores de esta fase.

**Fuente de la definición de "tutor" (PRD §12.14.1)**: *"El asistente de IA de Axioma complementará el sistema educativo mediante explicaciones personalizadas y contextuales. No reemplazará el contenido estructurado, el motor de recomendaciones ni la práctica deliberada. Su prioridad será ayudar al estudiante a comprender, no simplemente entregar respuestas."*

## 3. Alcance

**Dentro de alcance (PRD §12.14, Master Context §4.11/CUJ-10, Data Model Bloque 15, decisiones A-Q del Product Owner)**:

- Conversación con el Tutor IA — pestaña dedicada + acceso contextual (desde pregunta, explicación, resultado, recomendación, unidad/tema — PRD AI-001/AI-002).
- Modos de asistencia progresivos: pista → orientación conceptual → pasos → explicación → solución completa (fuera de actividades protegidas, decisión E).
- Cuotas diarias por plan (3 Free / 50 Premium, decisión A) y turnos máximos por conversación (6 Free / 15 Premium, decisión B).
- Contexto académico mínimo necesario (materia, tema, ejercicio no protegido, progreso estrictamente relevante — decisión G).
- Protección determinista de actividades evaluativas activas (decisión F).
- Integración real de Anthropic/`claude-sonnet-5` detrás de una abstracción de proveedor propia (decisión K), con timeout (8s, decisión I) y como máximo 1 retry técnico idempotente (decisión J).
- Historial de conversación con continuidad (decisión D — "sí" a continuar una conversación existente).
- Retención de 90 días de contenido conversacional desde la última actividad, con borrado manual y propagación desde eliminación de cuenta (decisión C).
- Disclaimer visible de IA (decisión N), reportes de respuesta (PRD AI-015, ya modelado en Data Model §15.28).
- Observabilidad de costo/latencia/errores sin copiar contenido conversacional completo (decisión P).
- Superficie móvil real (reemplaza el placeholder `ia.tsx`).

**Fuera de alcance (§9, decisiones A-Q, explícitamente reafirmado)**:

- Multimodalidad completa: imágenes, fotografías, PDF, archivos, audio, visión (decisión H) — incluye los tipos de bloque `image_reference`/`learning_resource_reference` de Data Model §15.8 (ver reconciliación #7, §20).
- Memoria automática entre conversaciones y perfil de memoria del estudiante (`ai_memory_item`, Data Model §15.36) — decisión D.
- Fallback multi-proveedor en producción (decisión K) — sin reevaluar OpenAI, sin reabrir DG-1/Gate C5.
- RAG general / búsqueda web / navegación autónoma (decisión Q).
- Clasificador ML propio de seguridad y plataforma de moderación humana completa (decisión M).
- Presupuesto monetario contractual fijo (decisión L — queda como configuración operativa, no como número contractual de este documento).
- Cualquier escritura directa a XP, dominio, resultados, suscripciones, ranking (Principio arquitectónico 1, ya vigente desde PRD AI-010).
- Herramientas de IA que modifiquen objetivos/planes sin confirmación explícita del estudiante (Data Model DM-D282).

## 4. Fuera de alcance

Ver §3 arriba (fusionado por claridad — el "fuera de alcance" es parte constitutiva del mismo análisis de alcance, mismo criterio editorial que `LEF-BLOCK-V-DEFINITION.md` §3).

## 5. Decisiones del Product Owner (A-Q, 2026-08-11)

Todas las decisiones A-Q se incorporan tal cual fueron dictadas, sin reinterpretación. Resumen trazable (detalle completo en las secciones temáticas §8-14 y en el diseño por incremento, §21-28):

| # | Decisión | Resumen |
|---|---|---|
| A | Cuotas | Free 3/día, Premium 50/día (**decisión final**, no propuesta — reconciliación #1, §20). Tres eventos distintos: solicitud → intento técnico de generación → **consulta consumida** (solo si el intento produce respuesta utilizable, §9). Regeneración voluntaria consume únicamente si produce respuesta utilizable; error previo a contactar proveedor, bloqueo previo a generación, timeout/fallo sin respuesta utilizable, y el retry técnico automático en sí mismo NUNCA consumen. Frontera de día: UTC calendario (reconciliación #1, §20). |
| B | Turnos por conversación | Free 6, Premium 15. 1 turno = mensaje del estudiante + respuesta del Tutor. Conversación sobrevive al cambio de día. Límite alcanzado no borra historial, solo bloquea turnos nuevos. |
| C | Retención | 90 días desde última actividad de la conversación. Borrado manual disponible antes. Integración con pipeline de privacidad existente (ADR-0005). Usage ledger separado del contenido, sin retención idéntica forzada a 90 días. |
| D | Memoria | Historial de conversación sí; continuar conversación existente sí (mientras esté disponible); memoria automática cross-conversación NO en V1; sin perfil de memoria del estudiante. |
| E | Soluciones completas | Permitidas fuera de actividades protegidas, siguiendo modelo progresivo (pista→guía→pasos→explicación→solución), nunca inmediatas por defecto. |
| F | Actividades protegidas | Tutor puede explicar conceptos/procedimientos generales; NO puede revelar/resolver/derivar equivalentemente la respuesta del ítem activo. Controles deterministas, no solo prompt. |
| G | Contexto académico | Minimización estricta — materia/tema/ejercicio no protegido/progreso relevante sí; perfil completo/ranking/historial competitivo/cosméticos/insignias/datos personales irrelevantes NO por defecto. |
| H | Multimodalidad | V1 TEXT-ONLY. Sin imágenes, PDF, audio, adjuntos. Sin upload/storage multimodal en este bloque. |
| I | Timeout | 8 segundos, técnico explícito. Sin respuesta utilizable → degradación controlada, consulta NO se consume. |
| J | Retries e idempotencia | Máximo 1 retry técnico automático, solo ante error transitorio elegible, misma consulta, nunca consume cupo adicional. Idempotencia obligatoria contra doble toque/retry de red/retry interno. Regeneración voluntaria = operación nueva, sí consume. |
| K | Fallback de proveedor | Ninguno en V1. Abstracción de proveedor desde el inicio. Implementación productiva: Anthropic/`claude-sonnet-5` (ADR-0022). Sin fallback silencioso a otro proveedor/modelo. |
| L | Control de coste | Defensa por capas: cuota diaria → turnos → límites de tokens/output → circuit breaker presupuestario interno → observabilidad. Sin exponer dólares al estudiante (UX: consultas restantes). Sin presupuesto monetario contractual fijo — configuración operativa. |
| M | Seguridad para menores | Defensa por capas: reglas de system prompt, controles deterministas donde sea posible, salvaguardas del proveedor, degradación segura. Sin clasificador ML propio ni plataforma de moderación humana completa en V1. |
| N | Disclaimer | Breve y visible, concepto aprobado: *"Axioma IA puede cometer errores. Verifica la información importante."* Redacción final editable sin alterar significado. Sin repetición invasiva por respuesta. |
| O | System prompt y versionado | Propiedad de Axioma, identidad/versionado explícito (`AXIOMA_TUTOR_V1` o equivalente), nunca string disperso en controllers. Cada generación asociable a versión de prompt + provider/model + configuración. Mensaje del usuario es siempre input no confiable, nunca modifica instrucciones de sistema. |
| P | Privacidad/Anthropic | Minimización estricta hacia el proveedor — mensaje actual, contexto de conversación activa, contexto académico mínimo, instrucciones del Tutor. Nunca nombre real/email/timezone/username/ranking/historial competitivo/cosméticos/insignias/datos irrelevantes. Analytics nunca copia prompts/respuestas completas. Contenido conversacional vive solo en su almacenamiento privado. |
| Q | Fuentes/Web/RAG | Sin web browsing, sin búsqueda autónoma, sin URLs inventadas, sin citas obligatorias complejas, sin RAG general en este bloque. Prioriza contenido curricular canónico cuando exista. Reconoce incertidumbre en vez de fabricar fuente. |

Más los 8 **principios arquitectónicos adicionales** del Product Owner (sin autoridad sobre XP/progreso/ranking/recompensas/respuestas evaluativas/estado académico canónico; LLM nunca modifica estado canónico directamente; Anthropic detrás de abstracción propia; controllers sin lógica de proveedor; dominio verificable sin llamadas reales repetidas; stub/fake determinista para gates; llamadas reales reservadas a gates de integración específicos; DG-1/Gate C5/ADR-0022 congelados) — incorporados como invariantes de bloque, §6.

## 6. Invariantes

1. El Tutor IA nunca modifica directamente XP, dominio, rachas, resultados de ensayos, suscripciones, historial de respuestas, recompensas ni rankings (PRD AI-010, ya vigente; reafirmado por el Product Owner).
2. Ninguna respuesta del modelo generativo modifica estado canónico de aprendizaje sin pasar por un servicio determinista y validado por el servidor del dominio propietario (PRD AI-010, Data Model DM-D282).
3. Anthropic vive exclusivamente detrás de una abstracción de proveedor propia — ningún archivo de dominio ni controller importa el SDK de Anthropic directamente (decisión K, Principio arquitectónico 3-4).
4. Ningún controller contiene lógica específica de proveedor (Principio arquitectónico 4).
5. El dominio del Tutor debe poder gatearse mayoritariamente contra un proveedor fake/stub determinista — las llamadas reales a Anthropic se reservan a gates de integración específicos, explícitamente identificados (Principio arquitectónico 5-7).
6. Ningún mensaje se sobrescribe — una regeneración crea un mensaje nuevo relacionado con el anterior (Data Model DM-D271, invariante #433/#434 — patrón de diseño ya aceptado, sin objeción de la auditoría).
7. Ninguna conversación es accesible por una cuenta distinta a su dueña — mismo criterio "endpoint `me`, nunca cross-cuenta" ya aplicado en todo el proyecto.
8. Ningún registro técnico (ejecución de modelo, ledger de uso, log de seguridad) contiene credenciales ni claves de API del proveedor (Data Model invariante #454).
9. Durante una actividad evaluativa protegida activa, el Tutor nunca revela, resuelve directamente ni deriva de forma equivalente la respuesta del ítem activo — verificado por control determinista, no solo por instrucción de prompt (decisión F).
10. El cupo diario y el límite de turnos son mecanismos independientes — agotar uno no afecta al otro (decisión A/B explícitas).
11. Un retry técnico automático nunca duplica consumo de cupo, ni el mensaje del estudiante ni la respuesta del Tutor se persisten dos veces por causa de un doble toque, un retry de red o un retry técnico interno — el retry pertenece al mismo intento técnico de generación, nunca a una segunda solicitud (decisión J, §9).
12. Una regeneración voluntaria del estudiante es siempre una operación nueva (nunca un retry técnico) y consume cupo únicamente si produce una respuesta utilizable — si también falla, no consume, por el mismo criterio que cualquier otro intento fallido (decisión J, §9).
13. El contenido completo de conversaciones nunca se copia a superficies de analytics/observabilidad (decisión P; PRD línea 6778 "Contenido completo de conversaciones con IA" ya listado como dato que NOTIF-025 no debe usar como identificador; ANALYTICS-021 ya prohíbe mostrar conversaciones completas por defecto en paneles).
14. La caída o degradación del proveedor de IA nunca bloquea Estudio, ensayos ni progreso (PRD PRD-D018/AI-020, Data Model invariante #452 — ya vigente, reafirmado).
15. El system prompt de Axioma tiene versión explícita; el mensaje del usuario es siempre input no confiable y nunca puede alterar instrucciones de sistema (decisión O; Data Model DM-D280, PRD AI-014).
16. DG-1, Gate C5 y ADR-0022 permanecen congelados — ningún archivo de este bloque los reabre, recalcula ni reinterpreta (Principio arquitectónico 8).
17. La retención del contenido conversacional (90 días) y la retención del usage ledger/métricas operativas son políticas independientes — ninguna se asume igual a la otra por defecto (decisión C, §11).

## 7. Arquitectura propuesta

**No vinculante en el detalle de nombres de archivo** (eso se decide al implementar cada incremento), pero fija la convención para evitar ambigüedad:

- Dominio backend nuevo: `apps/backend/src/ai/` — mismo criterio de separación por bounded context ya usado para `user/`, `gamification/`, `progress/`, `education/`. Prefijo de tabla `ai_*`, consistente con la nomenclatura ya usada por Data Model Bloque 15 (`ai_conversation`, `ai_message`, ...).
- Rutas HTTP bajo `/ai/me/...` — mismo patrón `me` exclusivo ya usado en `/gamification/me/...`/`/progress/me/...`/`/user/me/...`.
- **Abstracción de proveedor**: una interfaz de dominio (p. ej. `TutorProviderPort` o equivalente) con una implementación real (`AnthropicTutorProvider`) y una implementación fake/determinista para gates (`FakeTutorProvider`) — mismo espíritu que `StubIdentityProvider` ya usado en AUTH para gatear sin depender de un proveedor externo real.
- **Nunca reutilizar** `experiments/dg1-tutor-provider-eval/adapters/anthropic.mjs` tal cual — es código experimental (`.mjs`, fuera de cualquier paquete del workspace), no un punto de partida productivo. Puede consultarse como referencia de comportamiento observado del proveedor, nunca importarse.
- Persistencia mínima real: `ai_conversation`/`ai_message` (el núcleo irreducible — sin esto no hay producto). El resto del catálogo candidato de Data Model Bloque 15 (`ai_context_package`, `ai_retrieval_run`, `ai_safety_evaluation`, `ai_usage_ledger`, `ai_prompt_template`, etc.) se evalúa incremento a incremento bajo el mismo criterio ya usado en Bloque V Incremento 6 (§4.8 de esa definición): **auditar primero si es derivable/necesario con una tabla real o si un campo/servicio más simple basta; nunca construir la tabla candidata completa por defecto.**

## 8. Modelo de privacidad

Ver decisión P (§5) e invariantes 3/13/15 (§6). Resumen operativo:

- Al proveedor: mensaje actual + contexto de conversación activa + contexto académico mínimo (§9 de esta sección, ver también Modelo de contexto en el diseño de Incremento 3) + instrucciones del Tutor (versión de prompt). Nunca nombre real, email, timezone, username, ranking, historial competitivo, cosméticos, insignias, ni ningún otro dato personal irrelevante a la consulta (decisión G/P, Data Model §15.13 ya lo prohibía explícitamente para el mismo conjunto de campos).
- A analytics/observabilidad: metadata operativa (provider/model, versión de prompt, tokens, latencia, resultado, categoría de error, timestamps, identificadores técnicos mínimos) — nunca el contenido del mensaje ni de la respuesta completa (decisión P, invariante 13).
- El contenido conversacional (mensajes) vive exclusivamente en su almacenamiento privado (`ai_message`), nunca duplicado en un sistema de analítica.
- Eliminación de cuenta: debe integrarse con el pipeline de privacidad existente (ADR-0005, `PrivacyService`/`AuthService.requestAccountDeletion`) — mismo patrón de coordinación sin acceso directo cross-dominio ya usado en todo el proyecto.

## 9. Modelo de cuotas

Ver decisión A (§5) en detalle, más el diseño del Incremento 3 (§23). Resumen:

- Free: 3 consultas/día. Premium: 50 consultas/día.
- Frontera de día: **UTC calendario**, reutilizando exactamente la convención ya usada por `daily_cap` de XP (`xp-grant.service.ts`, función `utcDayRange`) y por el cálculo de racha (`streak-calculator.ts`, `utcDayKey`) — ver reconciliación #1, §20. Nunca se introduce una semántica de "día" basada en timezone del estudiante.
- Cuota diaria y límite de turnos por conversación son mecanismos independientes — nunca se confunden ni se comparten contador.

**Tres eventos distintos, deliberadamente no intercambiables** (precisión obligatoria, evita la ambigüedad de tratar "consulta" como sinónimo de "intento"):

1. **Solicitud**: el estudiante envía un mensaje que pasa la validación de entrada (no está bloqueado por seguridad/contexto insuficiente antes de intentar generar) — todavía no implica costo ni consumo.
2. **Intento técnico de generación**: la solicitud alcanza el punto de invocar al proveedor (real o fake). Un intento técnico puede incluir, como máximo, 1 retry automático (decisión J) — el retry pertenece al **mismo** intento, nunca es un segundo intento independiente.
3. **Consulta consumida**: ocurre **única y exclusivamente** cuando un intento técnico produce una **respuesta utilizable** correspondiente a una operación válida (un mensaje nuevo, o una regeneración voluntaria explícita). Es el único de los tres eventos que descuenta cupo.

Una solicitud o un intento técnico **nunca**, por sí solos, constituyen una consulta consumida. Exhaustivamente, **no** consumen cupo: error interno previo a contactar al proveedor, mensaje bloqueado antes de generación, timeout sin respuesta utilizable, fallo del proveedor sin respuesta utilizable, y el retry técnico automático en sí mismo (es parte del mismo intento fallido o exitoso, nunca un evento de consumo separado). Una regeneración voluntaria del estudiante **sí** es una operación nueva y consume cupo **si y solo si** produce una respuesta utilizable — si esa regeneración también falla (timeout/error), tampoco consume, por el mismo criterio del punto 3.

## 10. Modelo de conversación/turnos

Ver decisión B (§5) y diseño del Incremento 1/3. Resumen:

- 1 turno = 1 mensaje válido del estudiante + su respuesta correspondiente del Tutor.
- Free: máximo 6 turnos por conversación. Premium: máximo 15.
- La conversación sobrevive al cambio de día calendario — el límite de turnos es por conversación, no por día.
- Alcanzar el límite de turnos **no elimina el historial** — la conversación queda conservada en modo solo lectura (no acepta turnos nuevos); el estudiante puede iniciar una conversación nueva.
- Continuar una conversación existente es posible mientras siga disponible (no archivada/eliminada/en el límite de turnos) — decisión D.

## 11. Retención/borrado

Ver decisión C (§5). Resumen:

- Contenido conversacional (mensajes, conversación): 90 días desde la última actividad de esa conversación.
- Borrado manual disponible antes del vencimiento — el estudiante puede eliminar una conversación en cualquier momento (PRD AI-018 ya lo exigía).
- Eliminación de cuenta: se integra con el pipeline de privacidad ya existente (ADR-0005) — mismo criterio de propagación coordinada, nunca acceso directo cross-dominio.
- Usage ledger / métricas operativas: **entidad y política de retención separadas** del contenido conversacional (invariante 17, §6). Conserva únicamente metadata necesaria para cuota, coste, observabilidad y auditoría — su periodo de retención NO se asume igual a los 90 días del contenido, y este documento **no fija todavía** un número para esa retención distinta, sin inventar un valor indefinido sin justificación.
- **Este vacío es deliberadamente diferido, no bloqueante**: el ledger de uso ya existe operativamente desde el Incremento 3 (cuota/coste, §23) sin necesitar un número de retención para funcionar — solo necesita ese número para su eventual purga. No bloquea el inicio ni el cierre de los Incrementos 1-6. Debe resolverse a más tardar en el diseño detallado del Incremento 7 (Privacidad, retención y borrado, §27); si el Product Owner decide no fijarlo todavía en ese punto, debe quedar registrado explícitamente como deuda diferida en el cierre del bloque (§19), nunca asumido tácitamente como "para siempre".

## 12. Seguridad

Ver decisiones F/M/N (§5), invariantes 9/15/16 (§6). Resumen:

- **Actividades protegidas** (decisión F): control determinista (no solo prompt) que bloquea revelar/resolver/derivar equivalentemente la respuesta del ítem activo durante una actividad evaluativa protegida — reutiliza el mismo concepto de "actividad protegida"/política de revelación ya existente en EDUCATION/PROGRESS para ensayos.
- **Menores de edad** (decisión M): defensa por capas — reglas de system prompt, controles deterministas donde sea posible, salvaguardas nativas del proveedor, degradación segura. Explícitamente **sin** clasificador ML propio ni plataforma de moderación humana completa en V1.
- **Disclaimer** (decisión N): breve, visible, no invasivo, concepto aprobado *"Axioma IA puede cometer errores. Verifica la información importante."*
- **Reportes de respuesta**: mecanismo ya exigido por PRD AI-015 (marcar como incorrecta/confusa/extensa/poco relacionada/inapropiada) — el flujo operativo humano de revisión de esos reportes queda fuera del diseño detallado de este documento (ver §19, riesgo/deuda conocida).
- **Protección contra manipulación de instrucciones** (invariante 15, PRD AI-014): el mensaje del usuario nunca puede alterar las reglas internas del system prompt.

## 13. Integración con Anthropic

Ver decisión K (§5), ADR-0022 (congelado). Resumen:

- Implementación productiva V1: Anthropic/`claude-sonnet-5`, exactamente como fija ADR-0022 — sin reabrir, sin reevaluar OpenAI/Gemini.
- Abstracción de proveedor obligatoria desde el Incremento 2 — Anthropic nunca se referencia directamente fuera de su implementación concreta de esa interfaz.
- Sin fallback multi-proveedor en producción — si Anthropic falla, Axioma degrada de forma segura (mismo criterio ya exigido por PRD PRD-D018/AI-020), nunca cae silenciosamente a otro modelo/proveedor.
- Timeout técnico explícito: 8 segundos (decisión I) — distinto de cualquier UX de streaming si la arquitectura de mensajería lo requiere (a definir en el diseño detallado del Incremento 2).
- Máximo 1 retry técnico automático, solo ante errores transitorios claramente elegibles, mismo intento técnico, sin duplicar consumo de cupo (decisión J) — idempotencia obligatoria vía un identificador de idempotencia por solicitud (mismo patrón conceptual que `client_message_id` de Data Model §15.7, y que el patrón de idempotencia ya usado en `apps/mobile` para el outbox offline, ADR-0011). Esa idempotencia debe impedir explícitamente, ante doble toque/retry de red/retry técnico interno: doble consumo de cupo, **doble mensaje del estudiante persistido**, doble respuesta del Tutor persistida, y doble llamada lógica al proveedor — las cuatro, no solo la respuesta (invariante 11).

## 14. Observabilidad/costes

Ver decisión L (§5), Data Model §15.41. Resumen — defensa por capas, en este orden:

1. Cuota diaria (decisión A).
2. Límite de turnos por conversación (decisión B).
3. Límites de tokens/longitud de salida por ejecución (a definir en el diseño detallado, Data Model `token_budget`/`generation_parameters_version` como precedente conceptual).
4. Circuit breaker presupuestario/operativo interno — nuevo, sin precedente reutilizable directo en el proyecto (el `Throttler` de NestJS ya usado en `auth.controller.ts` cubre frecuencia, no presupuesto acumulado; este mecanismo debe construirse en el Incremento 3).
5. Observabilidad de uso — solicitudes completadas, latencia, errores, tokens, costo, uso por caso, respuestas bloqueadas, reportes (Data Model §15.41, catálogo de eventos §15.44 ya diseñado, reutilizable vía el patrón de outbox existente, ADR-0006/0017).

Sin exponer dólares al estudiante — la UX solo muestra "consultas restantes" de forma comprensible (decisión L). Sin presupuesto monetario contractual fijo en este documento — configuración operativa ajustable sin nueva definición de bloque.

## 15. Dependencias con sistemas existentes

- **AUTH** (ADR-0004): `AuthGuard`/`request.accountId` en todo endpoint — sin excepción cross-cuenta.
- **PRIVACY** (ADR-0005): coordinación de eliminación de cuenta → conversaciones/mensajes, mismo patrón de orquestación sin importar repos ajenos directamente.
- **ANALYTICS** (ADR-0006/0017): catálogo de eventos del Tutor (creación de conversación, respuesta completada, uso consumido, etc.) publicado vía el mismo outbox ya construido — sin contenido conversacional completo.
- **PROGRESS/EDUCATION** (ADR-0012/0014): fuente de lectura para contexto académico mínimo (tema actual, pregunta ya respondida, estado de cobertura) y para determinar si una actividad está protegida — solo lectura, mismo criterio que Bloque V Incremento 3.
- **GAMIFICATION** (Bloque I/III/IV): el Tutor nunca escribe en `xp_ledger_entry`/`league_point_ledger_entry`/tablas de dominio — mismo Decision Gate estático ya usado en Bloque V.
- **Bloque V (Perfil Avanzado)**: sin dependencia funcional — el historial de conversaciones del Tutor es un dominio propio, nunca se fusiona con `academicSummary`/`competitiveHistory`.
- **Ningún sistema de Bloques I-V se reabre** — confirmado por esta auditoría, sin contradicciones detectadas contra el código real de esos bloques.

## 16. Incrementos (tabla)

Ver §17 para la justificación del reordenamiento respecto de la propuesta inicial de la auditoría.

| # | Incremento | Contenido | Depende de |
|---|---|---|---|
| 1 | Fundación conversacional | `ai_conversation`/`ai_message` reales, endpoints de creación/lectura, sin IA real (respuesta stub/eco para validar contrato primero). Límite de turnos (decisión B) ya aplicable aquí — no requiere llamada a IA. | AUTH |
| 2 | Abstracción + integración de proveedor | Interfaz de proveedor propia, implementación fake/determinista + implementación real Anthropic/`claude-sonnet-5`, timeout (8s), clasificación de error técnico/bloqueo/límite/cancelación. | Incremento 1 |
| 3 | Cuotas, idempotencia y control de coste | Ledger de cupo diario (UTC), máximo 1 retry idempotente sin duplicar consumo, límites de tokens, circuit breaker presupuestario, "consultas restantes" en UX. | Incremento 2 |
| 4 | Contexto académico mínimo | Paquete de contexto minimizado desde PROGRESS/EDUCATION, acceso contextual desde pregunta/explicación/resultado. | Incrementos 1-3 |
| 5 | Comportamiento pedagógico | Modos progresivos (pista→pasos→solución), system prompt versionado (`AXIOMA_TUTOR_V1`), disclaimer. | Incremento 4 |
| 6 | Seguridad y actividades protegidas | Bloqueo determinista de ítems protegidos, capas de seguridad para menores, reportes de respuesta. | Incremento 4 |
| 7 | Privacidad, retención y borrado | Retención de 90 días, borrado manual, integración con pipeline de eliminación de cuenta, separación de usage ledger. | Incrementos 1-3 |
| 8 | Superficie móvil | Reemplaza `ia.tsx`, pestaña real + acceso contextual desde Estudio, consumo de los endpoints 1-7. | Incrementos 1-7 |

## 17. Reordenamiento respecto de la propuesta inicial — justificación técnica

La auditoría había propuesto: 1 Fundación, 2 Proveedor, 3 Contexto, 4 Comportamiento pedagógico, 5 Cuotas/turnos/idempotencia/coste, 6 Seguridad, 7 Privacidad/retención, 8 Móvil.

**Cambio real**: se adelanta "Cuotas, idempotencia y control de coste" de la posición 5 a la posición 3 (inmediatamente después de que exista un flujo de ejecución real, Incremento 2, y antes de invertir esfuerzo en contexto académico/comportamiento pedagógico sobre un flujo todavía sin gobierno de costo).

**Por qué**: el Incremento 2 ya deja operativa una llamada real (aunque acotada a gates de integración) a un proveedor de pago. Añadir contexto académico (antiguo Incremento 3) y comportamiento pedagógico (antiguo Incremento 4) **antes** de que exista cuota/idempotencia significaría, durante la implementación y prueba de esos incrementos, ejecutar llamadas reales sin ningún control de cupo ni protección contra doble consumo — exactamente el riesgo que la decisión L (defensa por capas) busca evitar desde la capa más externa. No hay dependencia técnica inversa real: cuotas/turnos/idempotencia no necesitan contexto académico ni comportamiento pedagógico para existir, solo necesitan que exista un punto de "solicitud que dispara una generación" (Incremento 2). El resto del orden (contexto → comportamiento pedagógico → seguridad, que depende de conocer qué ítem está protegido, es decir depende de contexto) se mantiene igual que la propuesta original. Privacidad/retención se mantiene en la posición 7 porque depende de que exista contenido real que retener/borrar (Incrementos 1-3), no de comportamiento pedagógico ni seguridad.

## 18. Gates (resumen; detalle exacto por incremento en §21-28)

Principios arquitectónicos 5-7 del Product Owner, aplicados a todo el bloque: el dominio se verifica **mayoritariamente** con un proveedor fake/determinista (mismo patrón que `StubIdentityProvider` en AUTH). Las llamadas reales a Anthropic se reservan a un gate de integración explícitamente identificado (Incremento 2), ejecutado deliberadamente y por separado — nunca como parte de la regresión rutinaria de otros incrementos ni de la regresión consolidada de LEF I-V.

Decision Gates de bloque (nivel LEF-BLOCK-VI, análogos a los 7 de Bloque V):

1. Ninguna escritura del Tutor en `xp_ledger_entry`/`league_point_ledger_entry`/tablas de dominio de otros bloques (estático).
2. Ningún endpoint expone conversación de otra cuenta (cross-cuenta, backend real).
3. Durante actividad protegida activa, ninguna respuesta revela/resuelve/deriva equivalentemente el ítem activo (backend real, con fixture de actividad protegida real).
4. Cuota diaria y límite de turnos son mecanismos verificablemente independientes (backend real).
5. Retry técnico nunca duplica consumo/persistencia (backend real, simulando fallo transitorio).
6. Caída simulada del proveedor → Estudio/ensayos siguen funcionando, consulta no se consume (backend real).
7. Ningún archivo de dominio importa el SDK de Anthropic fuera de su implementación concreta de la abstracción de proveedor (estático).
8. Regresión consolidada LEF I-V sigue en PASS después de cada incremento de este bloque.

## 19. Criterio de cierre del bloque

Mismo patrón que Bloques II-V: el bloque se considera cerrado cuando exista `LEF-BLOCK-VI-CLOSURE-REPORT.md` con las secciones estándar y cumpla, como mínimo:

1. Los ocho incrementos (§21-28) implementados y gateados individualmente, cada uno con su gate en PASS.
2. El gate consolidado del bloque encadena la regresión completa de LEF I-V más los gates propios de VI, en PASS.
3. Los ocho Decision Gates de bloque (§18) todos en PASS.
4. Verificación manual de la superficie móvil (Incremento 8) en Browser pane, en PASS.
5. Ninguna de las exclusiones de §3/§4 fue construida accidentalmente (verificado por inspección).
6. Todas las decisiones A-Q (§5) confirmadas como respetadas exactamente en la implementación — ninguna reinterpretada silenciosamente.
7. DG-1, Gate C5 y ADR-0022 confirmados intactos al cierre.
8. Estado final: APPROVED, con la misma exigencia de evidencia real ya usada en todos los cierres anteriores.

## 20. Auditoría final — reconciliaciones y contradicciones

**Ninguna decisión A-Q contradice una decisión contractual histórica verdaderamente cerrada.** Todas las reconciliaciones encontradas son de **propuesta provisional → decisión final** o de **pregunta abierta → decisión que la resuelve**, nunca de decisión cerrada → decisión distinta:

1. **PRD-D116** (*"El límite inicial **propuesto** para IA gratuita será de tres consultas diarias, **sujeto a costos**"*) — lenguaje explícitamente provisional. Decisión A lo **finaliza** exactamente en ese número (3/día). No es una contradicción — es la propuesta no vinculante convirtiéndose en decisión firme, dato coincidente.
2. **PRD §23.13** listaba *"límites y conservación"* como pendientes explícitos "antes de implementar IA". Decisiones A/B/C los resuelven. Sin contradicción — exactamente el trabajo que el PRD marcaba como pendiente.
3. **Data Model §15.45** pregunta *"¿Qué límites tendrá el plan gratuito?"* / *"¿Qué ventajas concretas ofrecerá Premium?"* / *"¿Qué política de retención tendrán conversaciones y adjuntos?"* / *"¿Se permitirá al usuario desactivar completamente la memoria?"* / *"¿Se permitirán imágenes de ejercicios en el lanzamiento?"* — las cinco quedan resueltas por A/B/L, C, D, H respectivamente. Ninguna tenía ya una respuesta cerrada que contradecir.
4. **Turnos por conversación (6/15) y timeout (8s) y máximo 1 retry** — ninguna fuente auditada fijaba un número previo; son decisiones enteramente nuevas, sin nada que reconciliar.
5. **Fallback de proveedor** — ADR-0022 §"Consecuencias" solo dejaba una *recomendación de diseño* ("debería evitar acoplamiento innecesario... queda como recomendación... no como abstracción implementada por este ADR"). Decisión K la **promueve** a requisito firme de Incremento 2, sin contradecir el ADR (que nunca prohibió ni exigió lo contrario) y sin reabrir la selección de proveedor en sí.
6. **Multimodalidad (TEXT-ONLY)** — Data Model §15.23 ya condicionaba explícitamente los adjuntos a *"el alcance confirmado para V1"*; decisión H confirma que ese alcance es "no" para V1. Sin contradicción.
7. **Nuance sobre `image_reference`/`learning_resource_reference`** (Data Model §15.8): estos tipos de bloque de mensaje se difieren junto con el resto de multimodalidad (decisión H) — el PRD §12.14.2 solo dice *"recursos visuales estáticos compatibles"* como capacidad **posible**, nunca obligatoria para V1; no hay contradicción, solo un alcance más acotado que el candidato máximo del Data Model. Los tipos de bloque puramente textuales/estructurados (`text`, `formula`, `table`, `ordered_steps`, `hint`, `warning`, `system_notice`) permanecen en alcance porque son texto/marcado estructurado, no contenido multimedia.
8. **DG-1/Gate C5/ADR-0022** — no fueron tocados por esta auditoría ni por este documento; verificado `git status`/`git diff` vacío contra esos archivos (§ reporte final).

**Ninguna decisión requirió detenerse.** No se encontró ninguna contradicción irreconciliable contra una decisión contractual histórica cerrada.

## 21. Diseño — Incremento 1: Fundación conversacional

**Objetivo**: persistencia real mínima de conversación/mensaje y contrato HTTP, sin IA real todavía — valida el modelo de datos y el contrato antes de invertir en la integración de proveedor.

**Alcance**: `ai_conversation`/`ai_message` (núcleo irreducible de Data Model §15.6-15.9, sin el resto del catálogo candidato). Endpoints `POST`/`GET` bajo `/ai/me/conversations` — creación, listado, lectura de una conversación, envío de mensaje (con una respuesta de eco/stub determinista, NUNCA IA real, para validar el contrato). Enforcement del límite de turnos (decisión B) ya aplicable aquí, porque es una propiedad pura del conteo de mensajes, sin depender de ninguna llamada a proveedor.

**Fuera de alcance**: cualquier llamada real o fake a un proveedor de IA (eso es Incremento 2); cuotas diarias (Incremento 3); contexto académico (Incremento 4).

**Datos/contratos afectados**: nuevas tablas `ai_conversation`/`ai_message` (mensajes inmutables, regeneración crea mensaje nuevo — invariante 6). Nuevo contrato en `packages/contracts`.

**Comportamiento esperado**: crear conversación, enviar mensaje, listar mensajes, continuar conversación existente (decisión D). Alcanzar el límite de turnos bloquea nuevos turnos sin borrar historial (decisión B).

**Invariantes**: mensajes inmutables; conversación pertenece a una sola cuenta, nunca cross-cuenta; límite de turnos independiente de cualquier cuota (todavía no existe cuota en este incremento).

**Casos de error**: sin sesión → 401; conversación de otra cuenta → 404 uniforme (mismo criterio ya usado en todo el proyecto); turno por encima del límite → rechazado explícitamente, nunca truncado silenciosamente.

**Gate verificable**: contra backend real — creación/lectura/continuación de conversación, límite de turnos alcanzado y verificado (backend real, sin necesidad de IA real ni fake todavía).

**Criterio exacto de cierre**: gate en PASS + regresión LEF I-V en PASS.

## 22. Diseño — Incremento 2: Abstracción + integración de proveedor

**Objetivo**: interfaz de proveedor propia, con una implementación fake/determinista (para el resto de gates del bloque) y la implementación real de Anthropic/`claude-sonnet-5` (ADR-0022), detrás de esa misma interfaz.

**Alcance**: puerto/interfaz de dominio para "generar respuesta del Tutor" (invariantes 3-5). Implementación fake determinista. Implementación real Anthropic — nunca reutilizando `experiments/dg1-tutor-provider-eval/adapters/anthropic.mjs` tal cual (código experimental, fuera de cualquier paquete). Timeout técnico explícito (8s, decisión I). Clasificación de resultado: completado / error técnico / bloqueo de seguridad / límite de uso / contexto insuficiente / cancelación (Data Model §15.9, ya diseñado).

**Fuera de alcance**: cuotas/idempotencia (Incremento 3); contexto académico real (Incremento 4, aquí el contexto puede ser mínimo/vacío para probar la plomería); comportamiento pedagógico específico (Incremento 5).

**Datos/contratos afectados**: posible tabla/registro de ejecución (`ai_model_execution` simplificado o equivalente) — solo si resulta estrictamente necesario para invariante 8 (ningún registro con credenciales) y para observabilidad mínima; evaluar antes de construir, mismo criterio que Bloque V Incremento 6.

**Comportamiento esperado**: mensaje válido → ejecución real o fake según configuración de entorno → respuesta persistida como mensaje nuevo del Tutor. Timeout a los 8s → degradación controlada, mensaje marcado como fallido, **sin consumir cupo** (cupo llega en Incremento 3, pero el diseño de este incremento debe dejar el punto de extensión listo).

**Invariantes**: Anthropic nunca referenciado fuera de su implementación concreta de la interfaz (invariante 3); ningún controller con lógica de proveedor (invariante 4); sin fallback silencioso a otro proveedor (decisión K).

**Casos de error**: timeout (8s) → degradación controlada; error transitorio → elegible para el retry de Incremento 3 (el mecanismo de retry se diseña aquí a nivel de interfaz, se gobierna en Incremento 3); bloqueo de seguridad del proveedor → clasificado explícitamente, nunca confundido con error técnico.

**Gate verificable**: **mayoritariamente contra el proveedor fake** (determinista, sin costo, sin red) — creación de respuesta, timeout simulado, clasificación de error. **Gate de integración real, separado y explícitamente identificado**: al menos una llamada real a Anthropic verificando que la abstracción funciona de punta a punta (ejecutado deliberadamente, no como parte de la regresión rutinaria).

**Criterio exacto de cierre**: gate fake en PASS + gate de integración real en PASS (ejecutado al menos una vez, documentado) + regresión LEF I-V en PASS + confirmación de que ningún archivo de dominio importa el SDK de Anthropic directamente (estático).

## 23. Diseño — Incremento 3: Cuotas, idempotencia y control de coste

**Objetivo**: gobernar el costo antes de invertir en contexto académico/comportamiento pedagógico sobre un flujo ya real (ver §17).

**Alcance**: ledger de cupo diario (Free 3, Premium 50 — decisión A), frontera UTC calendario (reutiliza `utcDayRange`/`utcDayKey`, §9/§20). Idempotencia por solicitud (identificador de idempotencia, mismo concepto que `client_message_id`, Data Model §15.7) — máximo 1 retry técnico automático, solo ante error transitorio elegible, sin duplicar consumo (decisión J). Límites de tokens/longitud de salida por ejecución. Circuit breaker presupuestario/operativo interno (nuevo, sin precedente reutilizable directo). "Consultas restantes" expuesto en el contrato de respuesta para la UX (decisión L).

**Fuera de alcance**: presupuesto monetario contractual fijo (queda como configuración operativa, decisión L); contexto académico (Incremento 4).

**Datos/contratos afectados**: tabla de ledger de uso (`ai_usage_ledger` simplificado o equivalente — mismo patrón append-only ya usado en `league_point_ledger_entry`/`xp_ledger_entry`).

**Comportamiento esperado**: solicitud → intento técnico → **consulta consumida** solo si el intento produce respuesta utilizable (§9, vocabulario de los tres eventos) → consume 1 unidad de cupo del día UTC actual. Error previo a contactar proveedor, bloqueo previo a generación, timeout/fallo sin respuesta utilizable, retry técnico automático → **no** consumen (decisión A, exhaustivo). Regeneración voluntaria → consume únicamente si produce respuesta utilizable (decisión J). Cupo agotado → rechazo explícito, nunca oculto ni silencioso; independiente del límite de turnos (invariante 10).

**Invariantes**: 10, 11, 12 (§6) — verificados explícitamente aquí.

**Casos de error**: cupo agotado → rechazo explícito con mensaje claro; retry duplicado (doble toque, retry de red) → nunca duplica consumo ni persistencia (idempotencia verificada).

**Gate verificable**: backend real — envío de exactamente 3 consultas Free consume el cupo, la 4ª se rechaza; timeout simulado no consume; retry técnico simulado no duplica; regeneración voluntaria sí consume; frontera de día verificada contra el mismo criterio UTC que XP/racha.

**Criterio exacto de cierre**: gate en PASS + regresión LEF I-V en PASS.

## 24. Diseño — Incremento 4: Contexto académico mínimo

**Objetivo**: construir el paquete de contexto minimizado (decisión G) desde PROGRESS/EDUCATION, habilitando el acceso contextual (PRD AI-002).

**Alcance**: selección de campos mínimos (materia, tema, ejercicio no protegido, progreso estrictamente relevante) — nunca perfil completo/ranking/historial competitivo/cosméticos/insignias/datos personales irrelevantes (decisión G, ya prohibido explícitamente por Data Model §15.13 para el mismo conjunto). Apertura contextual desde pregunta/explicación/resultado/recomendación/unidad/tema (PRD AI-002).

**Fuera de alcance**: RAG/búsqueda de contenido validado como sistema general (decisión Q — puede haber una referencia directa simple al contenido ya cargado en la actividad actual, nunca un pipeline de recuperación con embeddings).

**Datos/contratos afectados**: posible tabla/estructura de "paquete de contexto" simplificada, solo si resulta necesaria más allá de construir el payload en memoria por solicitud — evaluar antes de construir.

**Comportamiento esperado**: abrir el Tutor desde una pregunta ya respondida → el contexto enviado incluye exactamente pregunta/alternativa elegida/respuesta correcta/explicación validada/materia/tema/habilidad (PRD §8.8, ejemplo textual) — nunca más.

**Invariantes**: minimización estricta (decisión G/P); la pauta protegida nunca se incluye si la actividad todavía no permite revelarla (Data Model DM-D275 — precondición para el Incremento 6, construida aquí).

**Casos de error**: contexto insuficiente → clasificación explícita ya prevista en Incremento 2, aquí se activa con datos reales.

**Gate verificable**: backend real — inspección exhaustiva de claves del payload de contexto enviado a la abstracción de proveedor (fake, para no gastar en gates rutinarios), confirmando ausencia de campos prohibidos.

**Criterio exacto de cierre**: gate en PASS + regresión LEF I-V en PASS.

## 25. Diseño — Incremento 5: Comportamiento pedagógico

**Objetivo**: modelo progresivo pista→guía→pasos→explicación→solución (decisión E), system prompt versionado (decisión O), disclaimer (decisión N).

**Alcance**: modos de respuesta (subconjunto de Data Model §15.11 — a decidir cuáles exactamente se habilitan, empezando por los explícitamente mencionados en decisión E). System prompt con identidad/versión explícita (`AXIOMA_TUTOR_V1` o equivalente), nunca disperso en controllers (decisión O, invariante 15). Disclaimer visible, no repetido invasivamente (decisión N).

**Fuera de alcance**: bloqueo de actividades protegidas (Incremento 6, aunque el modo "solución completa" debe respetar ya la restricción de contexto del Incremento 4 — la pauta protegida simplemente no está en el contexto disponible).

**Datos/contratos afectados**: tabla/registro de versión de prompt (`ai_prompt_template`/versión simplificada, o un valor de configuración versionado si no se justifica una tabla completa — evaluar antes de construir).

**Comportamiento esperado**: solución completa entregada solo fuera de actividades protegidas, siguiendo la progresión, nunca como primera respuesta por defecto salvo solicitud explícita del estudiante (decisión E).

**Invariantes**: invariante 15 (system prompt versionado, input del usuario nunca lo modifica).

**Casos de error**: ninguno nuevo más allá de los ya clasificados en Incremento 2.

**Gate verificable**: backend real (contra proveedor fake determinista) — verificar que cada generación queda asociada a una versión de prompt trazable; verificar presencia del disclaimer en la superficie de respuesta.

**Criterio exacto de cierre**: gate en PASS + regresión LEF I-V en PASS.

## 26. Diseño — Incremento 6: Seguridad y actividades protegidas

**Objetivo**: bloqueo determinista de ítems protegidos (decisión F) y capas de seguridad para menores (decisión M).

**Alcance**: verificación determinista (no solo prompt) de que, durante una actividad evaluativa activa, el Tutor no revela/resuelve/deriva equivalentemente el ítem — reutiliza el estado real de "actividad protegida" ya existente en EDUCATION/PROGRESS para ensayos. Reglas de system prompt + controles deterministas + salvaguardas del proveedor + degradación segura para menores (decisión M). Reporte de respuesta (PRD AI-015, Data Model §15.28 ya diseñado).

**Fuera de alcance**: clasificador ML propio; plataforma de moderación humana completa (decisión M, explícito).

**Datos/contratos afectados**: posible tabla `ai_response_report` simplificada (ya modelada en Data Model §15.28) — endpoint de reporte.

**Comportamiento esperado**: durante ensayo activo, solicitar la solución del ítem activo → rechazado determinísticamente, con explicación conceptual general permitida en su lugar (decisión F, exacto).

**Invariantes**: invariante 9 (§6) — verificado explícitamente aquí, con al menos un control que no dependa únicamente de instrucción de prompt (p. ej., el contexto simplemente no contiene la pauta mientras esté protegida — Incremento 4 ya lo garantiza — más una verificación adicional determinista sobre la respuesta antes de entregarla).

**Casos de error**: intento de obtener la pauta protegida → rechazo explícito, nunca un error genérico que oculte el motivo real al equipo de observabilidad (aunque de cara al estudiante el mensaje puede ser genérico por diseño educativo).

**Gate verificable**: backend real — fixture de actividad protegida real, solicitud directa de la respuesta rechazada determinísticamente en múltiples formulaciones (no solo la pregunta literal, sino reformulaciones directas del mismo intento).

**Criterio exacto de cierre**: gate en PASS + regresión LEF I-V en PASS.

## 27. Diseño — Incremento 7: Privacidad, retención y borrado

**Objetivo**: retención de 90 días, borrado manual, integración con eliminación de cuenta (decisión C).

**Alcance**: job/mecanismo de expiración a los 90 días desde la última actividad de la conversación. Endpoint de borrado manual (ya con contrato desde Incremento 1, aquí se le añade la propagación real). Integración con `PrivacyService`/`AuthService.requestAccountDeletion` (ADR-0005) — mismo patrón de coordinación ya usado para otros dominios en ese pipeline. Separación explícita de la retención del usage ledger (decisión C — su periodo no se fija en este documento, ver §19).

**Fuera de alcance**: memoria cross-conversación (explícitamente fuera de todo el bloque, decisión D — no hay nada que retener/purgar de algo que nunca se construye).

**Datos/contratos afectados**: campo de expiración en `ai_conversation`, job de purga o consulta filtrada (a decidir en diseño detallado).

**Comportamiento esperado**: conversación sin actividad por 90 días → deja de estar disponible según la misma semántica de eliminación ya usada en el resto del proyecto (lógica primero, purga física según política). Eliminación de cuenta → conversaciones/mensajes de esa cuenta se eliminan como parte del mismo flujo coordinado.

**Invariantes**: contenido conversacional y usage ledger nunca comparten la misma política de retención por defecto (decisión C, explícito).

**Casos de error**: ninguno nuevo — mismo criterio de "eliminar cuenta" ya vigente.

**Gate verificable**: backend real — conversación con actividad simulada hace más de 90 días deja de ser accesible; borrado manual inmediato funciona; eliminación de cuenta de prueba propaga correctamente a conversaciones.

**Criterio exacto de cierre**: gate en PASS + regresión LEF I-V en PASS.

## 28. Diseño — Incremento 8: Superficie móvil

**Objetivo**: reemplazar el placeholder `ia.tsx` con las capacidades reales de los Incrementos 1-7.

**Alcance**: pantalla(s) que consumen los endpoints ya cerrados — conversación, mensajería, cuota restante visible, disclaimer, acceso contextual desde Estudio (mismo principio ya vigente en todo el proyecto: "el cliente no recalcula como autoridad", extendido aquí a cuota/turnos — el cliente nunca decide localmente si queda cupo, siempre confía en la respuesta del servidor).

**Fuera de alcance**: cualquier lógica de negocio nueva en el cliente; multimodalidad (decisión H, ya fuera de todo el bloque).

**Datos/contratos afectados**: ninguno nuevo — consumo de los contratos ya fijados en los Incrementos 1-7.

**Comportamiento esperado**: paridad completa con lo que exponen los endpoints — cupo restante, turnos restantes, disclaimer visible, estados de degradación (sin conexión, proveedor no disponible, límite alcanzado, contenido rechazado, contexto insuficiente) representados con el mismo lenguaje visual ya usado en el resto de la app.

**Invariantes**: sin estado local que pueda divergir silenciosamente del backend.

**Casos de error**: estados de carga/error estándar ya usados en el resto de la app.

**Gate verificable**: verificación manual en Browser pane (mismo criterio que el cierre de Bloques IV/V) — conversación, envío de mensaje, cupo restante, turnos, disclaimer, degradación simulada, todos ejercitados contra backend real con proveedor fake (nunca gastando llamadas reales para verificación manual rutinaria).

**Criterio exacto de cierre**: verificación manual completa en PASS + regresión LEF I-V en PASS + gate consolidado del bloque (`verify:lef-block-vi-gate` o nombre equivalente) encadenando todos los gates de los Incrementos 1-7 más los de Bloques I-V.
