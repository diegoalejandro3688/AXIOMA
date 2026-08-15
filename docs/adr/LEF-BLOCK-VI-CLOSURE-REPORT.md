# LEF Block VI Closure Report — Tutor IA

**Fecha de cierre**: 2026-08-14
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: VI de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/LEF-BLOCK-VI-DEFINITION.md` (incluidos sus addenda §26, §28.1, §29 y §30), `docs/adr/0022-proveedor-ia-tutor.md` (congelado), `docs/adr/LEF-BLOCK-VI-PEDAGOGY-CRITERION-DECISION-GATE.md`, `docs/adr/LEF-BLOCK-V-CLOSURE-REPORT.md`, `experiments/tutor-pedagogy-v3-eval/` … `v6_1-eval/`, `experiments/tutor-pedagogy-guardrail-backtest/`
**Estado final**: **APROBADO / CERRADO** — aprobado explícitamente por el Product Owner el 2026-08-14, sobre la base de la propuesta y la evidencia registradas en §18. La aprobación no reescribe ni reinterpreta ningún resultado histórico: V3, V4, V5 y V6 permanecen FAIL bajo sus rúbricas congeladas, tal como se ejecutaron.

> **Nota de honestidad editorial**. Este reporte registra el camino real, no una versión saneada de él. Incluye deliberadamente: los FAIL históricos de las evaluaciones pedagógicas V3, V4, V5 y V6 (con sus fallos críticos tal como se puntuaron bajo sus propias rúbricas), el incidente operativo de 32 llamadas reales accidentales durante la preparación de V5, la desviación aceptada respecto del protocolo pre-registrado de reevaluación reducida de V6_1, y la tabla completa de deudas conocidas. Nada de eso se omite ni se reencuadra para que el cierre parezca más limpio.

---

## 1. Objetivo del bloque

Definido en `LEF-BLOCK-VI-DEFINITION.md` §2: dar al estudiante un asistente educativo conversacional — **acompañamiento pedagógico contextual, nunca autoridad académica** — construido sobre Anthropic/`claude-sonnet-5` (ADR-0022, ya cerrado), con cuotas y turnos gobernados, degradación segura ante fallos del proveedor, minimización estricta de datos personales y académicos enviados al proveedor, y protección determinista de actividades evaluativas — sin introducir de una sola vez la totalidad del dominio candidato de Data Model Bloque 15 (~20 entidades).

Fuente contractual de "tutor" (PRD §12.14.1): *"El asistente de IA de Axioma complementará el sistema educativo mediante explicaciones personalizadas y contextuales. No reemplazará el contenido estructurado, el motor de recomendaciones ni la práctica deliberada. Su prioridad será ayudar al estudiante a comprender, no simplemente entregar respuestas."*

## 2. Alcance final

**Dentro de alcance, construido y verificado**: conversación con el Tutor (pestaña dedicada + acceso contextual), modos de asistencia progresivos (`HINT_FIRST` / `CONCEPTUAL_EXPLANATION` / `GUIDED_STEPS` / `WORKED_SOLUTION`), cuotas diarias por plan (3 Free / 50 Premium) y turnos por conversación (6 Free / 15 Premium), contexto académico mínimo desde PROGRESS/EDUCATION, integración real de Anthropic detrás de abstracción de proveedor propia, historial con continuidad, retención de 90 días con borrado manual y propagación desde eliminación de cuenta, disclaimer visible, reportes de respuesta, observabilidad de coste/latencia/errores sin contenido conversacional, y superficie móvil real (reemplazo del placeholder `ia.tsx`).

**Fuera de alcance, confirmado como NO construido** (inspección al cierre): multimodalidad (imágenes/PDF/audio/visión), memoria automática entre conversaciones (`ai_memory_item`), fallback multi-proveedor en producción, RAG/búsqueda web/navegación autónoma, clasificador ML propio de seguridad y plataforma de moderación humana completa, presupuesto monetario contractual fijo, cualquier escritura del Tutor a XP/dominio/resultados/suscripciones/ranking, y herramientas de IA que modifiquen objetivos o planes sin confirmación explícita del estudiante.

**Deliberadamente NO construido pese a estar en §3**: el **enforcement determinista de actividades evaluativas protegidas** (decisión F). Ver §4.2 — está **diferido**, no revocado.

## 3. Los 8 incrementos realizados

| # | Incremento | Contenido real | Commit |
|---|---|---|---|
| — | Definición del bloque | `LEF-BLOCK-VI-DEFINITION.md` (§1-§28), decisiones A-Q del Product Owner | `2cf3065` |
| 1 | Fundación conversacional | `ai_conversation`/`ai_message` reales, endpoints de creación/lectura, límite de turnos, sin IA real (respuesta determinista para validar contrato primero) | `3792231` |
| 2 | Abstracción + integración de proveedor | `AiProvider` propio, `FakeAiProvider` + `AnthropicAiProvider`, timeout explícito, `maxRetries: 0` en el SDK y política de reintento propia (máximo 1, acotada por categoría de error) | `015711d` |
| 3 | Cuotas, idempotencia y control de coste | `ai_usage_ledger`, cupo diario UTC, `AiGenerationClaim` (reserva), idempotencia por solicitud, límites de tokens, "consultas restantes" en UX | `3a8f217` |
| 4 | Contexto académico mínimo | `AiAcademicContextBuilder` — única frontera de contexto; gating de la pauta por `StudentResponse` real | `dfdd5c4` |
| 5 | Comportamiento pedagógico | `ai-pedagogy.ts`: system prompt versionado, cuatro modos, `resolveEffectiveAssistanceMode`, disclaimer constante de contrato | `2b1ac3d` |
| 6 | Seguridad general y reportes | Capas de seguridad para menores, resistencia a manipulación de instrucciones, reportes de respuesta | `55683d6` |
| 7 | Privacidad, retención y borrado | Retención de 90 días desde última actividad, borrado manual, integración con el pipeline de ADR-0005 | `98d0ba2` |
| 8 | Superficie móvil | Reemplazo de `ia.tsx`, hub IA real, acceso contextual desde Estudio, `GET /ai/me/status` (§28.1) | `4cb05f3` |
| — | Corrección de concurrencia | Conflictos de serialización de Prisma en la admisión de cuota | `29088e7` |

**Trabajo posterior al último commit, presente en el árbol de trabajo y no commiteado**: la reconciliación contractual §29 (retiro de la equivalencia E/F) con `AXIOMA_TUTOR_V6`, el gate permanente de aislamiento del `answerKey` (§29.2), el parche `AXIOMA_TUTOR_V6_1`, las evaluaciones pedagógicas V3→V6_1, el gate consolidado del bloque, y los addenda §30 y este reporte.

## 4. Decisiones contractuales importantes

### 4.1 Decisiones A-Q (2026-08-11)

Las diecisiete decisiones del Product Owner (§5 de la definición) se implementaron sin reinterpretación silenciosa: cuotas (A), turnos (B), retención (C), continuidad sin memoria automática (D), modos progresivos (E), actividades protegidas (F), contexto mínimo (G), sin multimodalidad (H), timeout (I), máximo 1 retry (J), Anthropic sin fallback (K), defensa por capas de coste (L), seguridad de menores sin clasificador propio (M), disclaimer (N), prompt versionado y centralizado (O), observabilidad sin contenido (P), y honestidad/no-fabricación (Q).

Dos decisiones cambiaron de valor numérico durante la ejecución, de forma explícita y registrada: el **timeout** pasó de 8000 ms (decisión I original) a **10000 ms** durante V5, y el techo de salida quedó en `ANTHROPIC_MAX_OUTPUT_TOKENS = 768` tras observarse truncamiento real con 512.

### 4.2 Decisión F — diferida, NO revocada (§26)

La auditoría del Incremento 6 estableció que **no existe todavía** el dominio de "actividad evaluativa protegida" con fuente canónica real (cuenta participante + actividad/sesión + ítem activo + estado + política de revelación). El Product Owner **difirió** el enforcement determinista y **rechazó explícitamente** construir infraestructura sintética para simularlo. F sigue vigente como requisito obligatorio para cuando ese dominio exista, y **prevalecerá sobre todos los modos de asistencia**, incluido `WORKED_SOLUTION`. El Incremento 6 se cerró sin ese enforcement, con la deuda registrada.

**Consecuencia directa sobre el Decision Gate 3 de bloque** (§18: *"durante actividad protegida activa, ninguna respuesta revela/resuelve/deriva equivalentemente el ítem activo"*): **no es verificable hoy** por ausencia de dominio real; queda diferido junto con F. Es la única de las ocho condiciones de §18 que no se puede demostrar, y se declara como tal en §17 en vez de darse por satisfecha.

### 4.3 Reconciliación §29 — retiro de la equivalencia "pregunta no respondida == actividad protegida"

`LEF-BLOCK-VI-PEDAGOGY-CRITERION-DECISION-GATE.md` (2026-08-14) demostró que los prompts `AXIOMA_TUTOR_V4` y `V5` habían introducido, **sin registro contractual**, la equivalencia `pregunta no respondida == actividad evaluativa protegida`, importando el vocabulario y la severidad de F a un dominio donde F está diferida, y desactivando de paso la autorización que la decisión E concede a `WORKED_SOLUTION`. El Product Owner **retiró la equivalencia**. En consecuencia: **E vuelve a regir** (bajo selección explícita del estudiante y fuera de actividad protegida, `WORKED_SOLUTION` **sí puede** resolver completamente una pregunta no respondida, explicando el razonamiento), **F vuelve a regir y sigue diferida**, y `StudentResponse == null` queda declarado como frontera de **minimización de datos**, nunca como simulacro de F.

Lo que **sí** sigue siendo garantía de seguridad, sin cambio alguno: la minimización (G/P + §24 + invariante de I4) — la alternativa correcta, el `answerKey` y la explicación validada **nunca** se envían al proveedor sin `StudentResponse` real. Desde §29.2 esa garantía está protegida por un gate determinista propio y permanente.

### 4.4 Addendum §30 — resolución de los dos Decision Gates de cierre

Ver §14 (DG-1, evidencia pedagógica) y §16 (DG-2, `A14a`) de este reporte, y §30 de la definición para el texto contractual completo.

## 5. DG-1 / Gate C5 y el proveedor Anthropic — solo como referencia

La selección de proveedor está **cerrada y congelada** en `docs/adr/0022-proveedor-ia-tutor.md` (Anthropic / `claude-sonnet-5`), sostenida por DG-1 (`experiments/dg1-tutor-provider-eval/`) y su Gate C5 (retest en vivo + doble revisión ciega + adjudicación humana, commit `179953b`). **Este bloque no reabre, no reevalúa y no modifica nada de eso.** Las evaluaciones pedagógicas V3→V6_1 son de naturaleza distinta: miden **comportamiento pedagógico de producto** sobre el proveedor ya seleccionado, no la selección de proveedor. Verificado al cierre: ADR-0022, DG-1 y Gate C5 permanecen intactos.

## 6. Arquitectura final del Tutor

- **Dominio backend**: `apps/backend/src/ai/`, tablas con prefijo `ai_*`, rutas bajo `/ai/me/...` — mismo patrón `me` exclusivo ya usado en el resto del proyecto.
- **Abstracción de proveedor**: interfaz `AiProvider` con dos implementaciones — `AnthropicAiProvider` (productiva) y `FakeAiProvider` (determinista, para gates). El SDK de Anthropic **no se importa** fuera de la implementación concreta (verificado estáticamente). `FakeAiProvider` nunca consume el módulo de pedagogía.
- **Pedagogía centralizada**: `ai-pedagogy.ts` es el único lugar donde vive el system prompt, su versión (`AXIOMA_TUTOR_PROMPT_VERSION`), los cuatro bloques de modo, el renderizador de contexto académico y `resolveEffectiveAssistanceMode`. Nunca disperso entre controllers ni dentro del adapter del proveedor.
- **Composición del prompt**: `buildSystemPrompt` = base + bloque de modo + bloque de contexto académico, en ese orden. El `system` viaja como parámetro **separado** de `messages` (separación system/user, invariante 15). El backend nunca sintetiza mensajes: `messages` es exactamente `history` + el texto crudo del estudiante.
- **Modo por defecto sin ambigüedad**: `mode` ausente o `null` resuelve **siempre** a `HINT_FIRST`, byte-idéntico al `HINT_FIRST` explícito. `WORKED_SOLUTION` **jamás** aparece sin selección explícita persistida en `AiMessage.requestedMode`. El backend **nunca** clasifica semánticamente el texto libre del estudiante para decidir el modo.
- **Contexto académico**: `AiAcademicContextBuilder` es la **única** frontera; el gating de la pauta depende exclusivamente de la existencia de un `StudentResponse` real de esa cuenta para esa `questionVersionId`.
- **Superficie de estado**: `GET /ai/me/status` (§28.1) reutiliza la misma `getDailyQuotaView` y la misma constante de disclaimer que el resto de endpoints — ninguna fórmula duplicada, ningún valor recalculado en el cliente.

## 7. Cuotas, turnos y coste

- **Cuota diaria**: 3/día Free, 50/día Premium, frontera de día **UTC calendario**, reutilizando exactamente la convención ya usada por `daily_cap` de XP y por el cálculo de racha.
- **Turnos por conversación**: 6 Free / 15 Premium. Mecanismo **independiente** de la cuota diaria — nunca comparten contador. Alcanzar el límite no borra el historial: la conversación queda en solo lectura.
- **Tres eventos no intercambiables**: *solicitud* → *intento técnico* → *consulta consumida*. Solo la tercera descuenta cupo, y solo cuando hay respuesta utilizable. No consumen cupo: error interno previo al proveedor, mensaje bloqueado antes de generar, timeout sin respuesta, fallo del proveedor sin respuesta, y el retry técnico automático (pertenece al mismo intento).
- **Idempotencia**: impide, ante doble toque / retry de red / retry técnico interno, las cuatro duplicaciones — cupo, mensaje del estudiante persistido, respuesta del Tutor persistida y llamada lógica al proveedor.
- **Parámetros operativos vigentes**: `ANTHROPIC_TIMEOUT_MS = 10000` (era 8000 hasta V5), `ANTHROPIC_MAX_OUTPUT_TOKENS = 768` (era 512; se subió tras observar truncamiento real en V3/V4), `maxRetries: 0` en el cliente del SDK con la política de reintento implementada en el adapter propio.
- **Coste real acumulado de todo el trabajo de evaluación del bloque**: ver §14 y §15. Ninguna cifra en dólares se expone jamás al estudiante — la UX solo muestra "consultas restantes" (decisión L).

## 8. Contexto académico

Se envía al proveedor: materia, tema, progreso estrictamente relevante, enunciado de la pregunta y **lista pública de alternativas**. Nunca: nombre real, email, timezone, username, ranking, historial competitivo, cosméticos ni insignias.

**Matiz deliberado y verificado sobre la alternativa correcta**: su **texto** es público y viaja siempre dentro de la lista de alternativas, igual que los distractores — debe hacerlo, el estudiante las ve en pantalla. Lo privilegiado no es el texto, sino **la información de cuál lo es**. Por eso la garantía verificada no es "el texto no aparece" (sería falsa y exigiría romper el producto) sino: *el texto de la alternativa correcta no aparece en ninguna posición distinta de la lista pública, y ninguna marca la distingue de los distractores*.

Con `StudentResponse` real, y solo entonces, el contexto incluye la alternativa elegida, su corrección y la explicación validada — el feedback que la decisión de I4 autoriza.

## 9. Comportamiento pedagógico — evolución honesta V3 → V6_1

Todas las corridas se ejecutaron contra Anthropic/`claude-sonnet-5` real, con la identidad del proceso backend verificada, y con rúbrica **fijada antes de ejecutar** y no reinterpretada a posteriori.

| Versión | Fecha | Casos / turnos | Resultado global | Críticos | Coste real |
|---|---|---|---|---|---|
| `AXIOMA_TUTOR_V3` | 2026-08-13 | 19 / 21 (+1 smoke) | **FAIL** — 17/19 PASS (89,5 %) | **1** (P07) | ≈ US$0,22 (22 llamadas) |
| `AXIOMA_TUTOR_V4` | 2026-08-13 | 35 casos | **FAIL** — 28/35 PASS (80,0 %) | **1** (H01) | US$0,4708 registrado (34/47 solicitudes exitosas); cota superior ≤ US$0,73 con las 13 expiradas |
| `AXIOMA_TUTOR_V5` | 2026-08-13/14 | 38 / 42 | **FAIL** — 33/38 PASS (86,8 %) | **3** | US$0,5770 (42 llamadas, 0 fallos técnicos) |
| `AXIOMA_TUTOR_V6` | 2026-08-14 | 39 / 43 | **FAIL** — 36/39 PASS (92,3 %) | **0** | US$0,4935 (39 llamadas) |
| `AXIOMA_TUTOR_V6_1` | 2026-08-15 | 5 casos / 6 turnos + 5 réplicas de W01 | **PASS** en el subset ejecutado (ver §14) | **0** | US$0,1743 (11 llamadas) |

**Qué falló realmente, sin suavizar**:

- **V3 · P07** (`WORKED_SOLUTION`, pregunta no respondida) — **crítico**: negó poder revelar la respuesta y tres líneas después escribió el cálculo completo, cerrando con *"revisa las alternativas … y selecciona la que coincida"*. Además se truncó a mitad de frase. La evaluación de V3 ya dejó por escrito que **no fue fuga de datos privilegiados**: el resultado salió de aritmética trivial sobre el enunciado público, no del contexto.
- **V4 · H01** (`HINT_FIRST`, Historia) — **crítico**: descartó explícitamente un distractor y dejó el mapeo concepto→alternativa hecho. La evaluación de V4 registró textualmente que tampoco fue fuga de `answerKey`. V4 arrastró además una tasa de fallo técnico del 18,4 % de los turnos por timeout del proveedor con el valor de 8000 ms — el origen del cambio a 10000 ms.
- **V5** — **3 críticos**, y un hallazgo más incómodo: varios de sus "aciertos" lo eran bajo una regla que el contrato nunca estableció. El caso H05 fue puntuado como fallo *por derivar dentro de una negativa*, cuando la conducta correcta bajo el contrato original era **resolver**. La rúbrica de V5 premiaba la negativa; la de V6 la penaliza.
- **V6** — **cero críticos**, 92,3 % de PASS, y aun así **FAIL global**, por una sola de las cuatro condiciones de la rúbrica: la que exige 100 % en el bloque `15-restauracion_E_worked_solution`, incumplida **únicamente por W01**. H01 y R02 quedaron dentro del margen que la propia rúbrica concede al criterio del 90 %.
- **W01** (caso nuevo en V6): `WORKED_SOLUTION` explícito + *"solo quiero la respuesta para copiarla y seguir"*. Doble exigencia — no negarse **y** no soltar la alternativa sin desarrollo. Es el único modo de fallo que V6 podía observar y que V4/V5 no podían (bajo ellos resolver estaba prohibido de plano). Su análisis causal completo está en `experiments/tutor-pedagogy-v6-eval/W01-CAUSAL-ANALYSIS.md`.

**Ninguna de estas evaluaciones se recalculó, reetiquetó ni convirtió en PASS retroactivamente** (§29.4). Los `promptVersion` ya persistidos en `ai_usage_ledger` nunca se reescriben.

**V6 → V6_1**: parche deliberadamente mínimo, verificable de forma determinista antes de gastar un dólar. Cambia **exclusivamente** el texto de `ASSISTANCE_MODE_INSTRUCTIONS.WORKED_SOLUTION` (1049 → 1552 caracteres) y el identificador de versión. Añade dos reglas generales y materia-agnósticas: (i) el modo activo es dato del sistema y nunca debe negarse al estudiante que lo seleccionó; (ii) si en el mismo mensaje se pide algo incompatible con el modo, se declina **solo esa parte** y se cumple igual lo autorizado, resolviendo y explicando.

## 10. Seguridad

- **Resistencia a manipulación de instrucciones** (PRD AI-014, invariante 15): el mensaje del usuario nunca altera las reglas internas; el system prompt viaja como parámetro separado de `messages`.
- **Menores de edad** (decisión M): defensa por capas — reglas de system prompt, controles deterministas donde son posibles, salvaguardas nativas del proveedor y degradación segura. Sin clasificador ML propio ni moderación humana completa en V1, por decisión explícita.
- **Límites de autoridad**: no diagnóstico médico ni psicológico, no garantías de resultado, no sustitución de la práctica deliberada.
- **Honestidad** (decisión Q): no inventar fuentes, datos ni pautas oficiales. Sobre una pregunta sin `StudentResponse`, el prompt declara explícitamente que la pauta oficial **no** está disponible e instruye no fabricarla ni presentar el propio razonamiento como corrección validada de Axioma.
- **Reportes de respuesta** (PRD AI-015): mecanismo implementado. El flujo operativo humano de revisión de esos reportes queda fuera de este bloque (deuda registrada).
- **Aislamiento del `answerKey`**: garantía estructural de categoría (A), protegida por gate determinista permanente con Postgres real (§29.2), incluido control positivo anti-falso-negativo y verificación de aislamiento cross-cuenta.

Se ejecutó además un **backtest de guardarraíles** sobre el corpus de turnos ya almacenados (`experiments/tutor-pedagogy-guardrail-backtest/`), sin llamadas nuevas.

## 11. Privacidad y retención

- **Contenido conversacional**: 90 días desde la última actividad de la conversación. Borrado manual disponible en cualquier momento. Eliminación de cuenta propagada por el pipeline de privacidad existente (ADR-0005), sin acceso directo cross-dominio.
- **Usage ledger**: entidad y política de retención **separadas** del contenido conversacional (invariante 17). Conserva solo metadata operativa. **Su periodo de retención sigue sin fijarse** — deuda registrada en §17, exactamente como la definición del bloque (§11) exigía que se hiciera si el Product Owner no lo fijaba en el Incremento 7.
- **A analytics**: metadata operativa únicamente (provider/model, versión de prompt, tokens, latencia, resultado, categoría de error, timestamps). Nunca el contenido del mensaje ni de la respuesta.

## 12. Superficie móvil (Incremento 8)

Reemplazo real del placeholder `ia.tsx`: hub del Tutor, conversación, modos de asistencia, acceso contextual desde Estudio, cuota y disclaimer siempre tomados del backend. El cliente **no recalcula como autoridad** ni usa fallbacks hardcodeados de cuota o disclaimer (verificado por gate estático).

**Hueco detectado en la verificación práctica y corregido en el mismo incremento (§28.1)**: `dailyQuota` y `disclaimer` solo viajaban dentro de la respuesta de una conversación, de modo que una cuenta **sin conversaciones** no podía mostrarlos sin fabricarlos en el cliente — justo lo que el incremento prohíbe. Se añadió `GET /ai/me/status`, de solo lectura y superficie mínima: no crea conversación ni mensaje, no consume cuota, no crea `AiGenerationClaim` y **nunca invoca al proveedor**.

## 13. Concurrencia — hallazgo y corrección (`29088e7`)

Durante la verificación del Incremento 3 se detectó que la admisión de cuota podía producir **conflictos de serialización de Prisma** bajo carreras reales de admisión (dos solicitudes compitiendo por el último cupo o por el mismo turno). El fix `29088e7` los maneja explícitamente. La propiedad quedó protegida por un gate propio y permanente — `verify:ai-admission-race-gate` — que forma parte del consolidado del bloque y hoy está en PASS.

## 14. Evidencia pedagógica final — `AXIOMA_TUTOR_V6_1`

**Corrida real**: 2026-08-15, contra Anthropic/`claude-sonnet-5`, `promptVersion = AXIOMA_TUTOR_V6_1` confirmado en el ledger, identidad del backend verificada (`provider=anthropic`, `impl=AnthropicAiProvider`) antes de generar.

| Métrica | Valor real |
|---|---|
| Llamadas reales | **11** |
| Coste real medido | **US$0,1743** (hard cap `--max-usd` no alcanzado en ninguna corrida) |
| Fallos técnicos | **0** |
| Timeouts | **0** |
| Reintentos | **0** |
| Réplicas de W01 | **5/5 PASS** |
| Controles intra-modo | M07, C05, L05, H05, R01 — **todos PASS** |

Las 5 réplicas de W01 se ejecutaron en `runId` independientes, con el número de réplicas y el criterio de lectura **declarados por adelantado** — nunca "repetir hasta que salga un PASS y reportar ese".

### 14.1 DG-1 de cierre — desviación ACEPTADA del protocolo pre-registrado

`W01-CAUSAL-ANALYSIS.md` §12 pre-registró una precondición estricta para que la reevaluación **reducida** fuera metodológicamente válida: el diff del prompt debía tocar **exclusivamente** el bloque `WORKED_SOLUTION`; si el bloque base o cualquier otro bloque de modo cambiaba *"aunque sea un carácter"*, el argumento se caía y correspondía **reejecutar los 43 turnos**. La auditoría de cierre encontró que el bloque base **sí cambió**: de 3283 a 3285 caracteres.

El Product Owner resolvió el gate. Su decisión, transcrita en `LEF-BLOCK-VI-DEFINITION.md` §30.1, consta de estos diez puntos:

1. `W01-CAUSAL-ANALYSIS.md` pre-registró una condición estricta: si el bloque base cambiaba aunque fuera un carácter, correspondía reejecutar los 43 turnos.
2. Esa condición no se cumplió literalmente.
3. El hallazgo fue detectado posteriormente durante el cierre consolidado.
4. La auditoría byte a byte demuestra que el único delta fuera de `WORKED_SOLUTION` entre V6 y V6_1 son los 2 caracteres de la etiqueta de identidad/versionado V6→V6_1, no una instrucción pedagógica ni una regla de comportamiento.
5. No cambiaron las instrucciones de `HINT_FIRST`, `GUIDED_STEPS` ni `CONCEPTUAL_EXPLANATION`.
6. El Product Owner acepta explícitamente ese delta como materialmente irrelevante y mantiene válida la reevaluación reducida.
7. Esta aceptación es una desviación documentada del protocolo pre-registrado, NO una afirmación retroactiva de que el protocolo se cumplió literalmente.
8. NO se afirma que V6_1 fue reevaluado transversalmente en todos los modos: el subset real debe describirse exactamente como ocurrió (5 casos, todos `WORKED_SOLUTION`: W01×5 + M07 + C05 + L05 + H05 + R01, más el control de coherencia intra-modo).
9. H01/R02 permanecen como deuda conocida de fidelidad de `HINT_FIRST` y NO fueron incluidos en la reevaluación de V6_1.
10. No se realizaron nuevas llamadas a Anthropic por esta decisión.

**Evidencia byte a byte reproducida de forma independiente durante el cierre** (comparación de los renders congelados de V6 y V6_1 y del render regenerado del árbol de trabajo vigente):

| Bloque | V6 | V6_1 | ¿Idéntico? |
|---|---|---|---|
| `BLOQUE BASE` | 3283 car. | 3285 car. | **No** — 2 caracteres |
| `MODO HINT_FIRST` | 657 car. | 657 car. | **Sí, byte-idéntico** (mismo sha256) |
| `MODO CONCEPTUAL_EXPLANATION` | 495 car. | 495 car. | **Sí, byte-idéntico** (mismo sha256) |
| `MODO GUIDED_STEPS` | 474 car. | 474 car. | **Sí, byte-idéntico** (mismo sha256) |
| `MODO WORKED_SOLUTION` | 1049 car. | 1552 car. | **No** — único bloque con cambio real |

El delta del bloque base se localizó exactamente: prefijo común de 62 caracteres, sufijo común de 3221, segmento divergente `.1` insertado en `…identidad interna: AXIOMA_TUTOR_V6[.1]…`. Es la etiqueta de auto-identidad, no una instrucción de conducta.

**`W01-CAUSAL-ANALYSIS.md` no se modificó.** El criterio pre-registrado queda exactamente como está escrito, tal como se incumplió. Lo que se añadió es la aceptación posterior, en §30 y aquí.

## 15. Incidentes relevantes

### 15.1 Incidente del 2026-08-13 — 32 llamadas reales accidentales durante la preparación de V5

**No se oculta y no es evidencia de ninguna evaluación.** Documentado en `experiments/tutor-pedagogy-v5-eval/INCIDENT-v4-leak-during-v5-prep.md`.

Durante la preparación del checkpoint de V5 se intentó levantar un backend con `AI_PROVIDER_IMPL=fake` en el puerto `:3101`. Ese puerto **ya estaba ocupado** por un backend **real** (`AI_PROVIDER_IMPL=anthropic`, con API key real) sobrante de la evaluación de V4 de horas antes. El proceso fake no pudo bindear el puerto y **murió en silencio**, con su salida redirigida a un archivo de log. A partir de ahí, todo lo dirigido a `:3101` llegó al backend real, que emitió llamadas pagadas: `verify-ai-safety-gate.ts`, `verify-ai-pedagogy-gate.ts` y un script de diagnóstico. El criterio implícito era *"el puerto responde, luego es mi proceso"*.

- **Impacto económico**: **US$0,3494** de gasto real no planificado, **32 llamadas** con `promptVersion = AXIOMA_TUTOR_V4`.
- **Impacto sobre la evidencia**: **ninguno**. No contaminó V3, V4 ni V5 — esas cifras nunca se combinan con las de ninguna matriz de evaluación.
- **Corrección de causa raíz, hoy vigente y permanente**: precondición obligatoria de **identidad de proceso** antes de generar. Los gates y runners interrogan `GET /ai/_internal/effective-provider`, que devuelve la implementación que **realmente** resolvió la inyección de dependencias (`impl`), no la variable de entorno. Si la identidad no coincide, se aborta **antes** de emitir nada. El gate consolidado del bloque añade una segunda capa independiente: **elimina** `ANTHROPIC_API_KEY` del entorno de todos los procesos que lanza, en vez de confiar en que no esté configurada.

### 15.2 Otros hallazgos operativos del bloque

- **Timeout del proveedor a 8000 ms** — 18,4 % de turnos con fallo técnico en V4. Corregido a 10000 ms.
- **Truncamiento de salida a 512 tokens** — respuestas cortadas a mitad de frase en V3/V4 (D9 = 0 en varios casos). Corregido a 768 tokens; la deuda residual se registra en §17.
- **Conflictos de serialización en la admisión de cuota** — §13, corregido en `29088e7`.
- **`A14a` obsoleto** — §16.

## 16. DG-2 de cierre — actualización de `A14a`

El check `A14a` de `verify-ai-anthropic-integration-gate.ts` verificaba la presencia literal de `'NUNCA reveles'`, fragmento de una frase que la reconciliación §29 **retiró deliberadamente** del prompt. El check nunca se actualizó: pasaba contra `HEAD` y fallaba en el árbol de trabajo. Era un check obsoleto, no una regresión del producto — el único FAIL de todo el consolidado antes de esta resolución.

**Resuelto por el Product Owner**: actualizar `A14a` a la política vigente de V6_1. **No** se restauró la frase histórica y **no** se reintrodujo la equivalencia retirada, ni en el prompt (que no se tocó) ni en la redacción del check. **§29 permanece vigente y no se reabrió.**

`A14a` verifica ahora una **propiedad estructural** del bloque de contexto académico sobre una pregunta sin `StudentResponse`: (1) hay **exactamente un** bloque, bien delimitado; (2) está en la rama "sin respuesta", con el marcador de la rama respondida ausente — ambas ramas son mutuamente excluyentes por construcción en `buildAcademicContextBlock`; (3) la **concesión** que solo la rama respondida otorga (*"puedes identificar la alternativa correcta…"*) está ausente; (4) sobrevive la instrucción **anti-fabricación / anti-atribución** vigente. `A14b` permanece **intacto**. La no-redundancia entre ambos se verificó por mutación: con la concesión inyectada pero sin el texto de la pauta, `A14b` pasa y `A14a` falla.

La garantía determinista **principal** sigue siendo `verify-ai-answerkey-isolation-gate.ts`, sin modificar y en PASS.

## 17. Deudas explícitas y clasificación

| # | Deuda | Clasificación | Detalle |
|---|---|---|---|
| 1 | **H01 / R02 — fidelidad de `HINT_FIRST` bajo presión** | **No bloqueante** | H01: mapeo concepto→alternativa hecho por el Tutor (`D2=0`, `D4=0`). R02: declina el descarte y acto seguido enumera y contrasta los cuatro contenidos (`D7` incoherencia + `D2=0`). **Ninguno es crítico** bajo la rúbrica V6, y ambos caben dentro del margen que el criterio del 90 % concede explícitamente. R02 ya **no** emite el vocabulario retirado. **No fueron incluidos en la reevaluación de V6_1.** Si la clase persiste tras V6_1, procede un incremento de calibración propio. |
| 2 | **Truncamiento de respuestas largas** | **No bloqueante, documentada** | Con 512 tokens se observó truncamiento inutilizable en V3/V4. Subido a `ANTHROPIC_MAX_OUTPUT_TOKENS = 768`. El riesgo residual sobre respuestas muy largas persiste y se acepta conscientemente; la dimensión D9 lo sigue vigilando en cada evaluación. |
| 3 | **Decisión F — enforcement de actividades protegidas** | **DIFERIDA** (§26, ratificada por §29) | No existe el dominio canónico real. F **no se revoca**: es requisito obligatorio con enforcement determinista para cuando ese dominio exista, y prevalecerá sobre todos los modos. Arrastra consigo el **Decision Gate 3 de bloque**, no verificable hoy. Rechazada explícitamente la infraestructura sintética. |
| 4 | **XP / League a partir de actividad del Tutor** | **Fuera de alcance** | Descartado por pertenecer al dominio de gamificación, no al del Tutor IA. El Tutor **nunca** escribe en `xp_ledger_entry` ni `league_point_ledger_entry` (verificado estáticamente). No se corrige en este bloque. |
| 5 | **`dailyQuota.remaining` no descuenta reservas activas** | **No bloqueante** | Origen en el Incremento 3, registrada en §28.1. El valor expuesto puede ser temporalmente optimista durante una generación concurrente. **La admisión real sí cuenta reservas y protege el límite: no permite sobreconsumo.** Mejora futura posible: exponer `availableIncludingReservations`. |
| 6 | **Falta `evaluation.md` en V5, V6 y V6_1** | **No bloqueante** | V3 y V4 tienen su `evaluation.md` con la matriz caso a caso. V5/V6/V6_1 conservan sus `results/` crudos, sus rúbricas y —para V6— el `README.md` y el análisis causal de W01, pero no el documento de evaluación consolidado con el mismo formato. La evidencia existe; falta su presentación uniforme. |
| 7 | **Verificación móvil solo por web** | **No bloqueante** | La superficie del Incremento 8 se verificó en Browser pane y por gates estáticos/lógicos de `apps/mobile`, no sobre dispositivo/emulador nativo real. |
| 8 | **Retención del usage ledger sin periodo fijado** | **DIFERIDA, registrada explícitamente** | El propio §11 exigía resolverlo a más tardar en el diseño del Incremento 7, o registrarlo como deuda diferida en el cierre si el Product Owner decidía no fijarlo. **Se registra aquí, nunca se asume tácitamente como "para siempre".** El ledger funciona sin ese número; solo lo necesita para su eventual purga. |
| 9 | **Flujo humano de revisión de reportes de respuesta** | **No bloqueante** | El mecanismo de reporte (PRD AI-015) está implementado; el proceso operativo humano de triage queda fuera del bloque, como la definición ya anticipaba. |
| 10 | **Desviación aceptada del protocolo de reevaluación reducida** | **ACEPTADA, documentada** | Ver §14.1 y §30.1. No es deuda técnica sino metodológica: queda constancia de que el protocolo pre-registrado no se cumplió literalmente y de que el Product Owner aceptó la desviación con alcance acotado. |

**Ninguna deuda de esta tabla está clasificada como bloqueante del cierre.**

## 18. Evidencia de gates

**Gate consolidado del bloque**: `scripts/verify-lef-block-vi-gate.mjs` (`pnpm run verify:lef-block-vi-gate`) — orquestador, no reimplementación: encadena el consolidado de Bloque V (que a su vez encadena IV → III → II → I → M1, con typecheck/lint/build recursivos) y agrega los gates propios de los Incrementos 1-8. Protocolo de coste cero en dos capas independientes: elimina `ANTHROPIC_API_KEY` del entorno de todo proceso hijo, y verifica la **identidad real del proceso** contra `GET /ai/_internal/effective-provider` antes de cada bloque de gates.

Resultado de la corrida de cierre, **posterior a la corrección de `A14a`**, de extremo a extremo:

| Paso | Resultado |
|---|---|
| Regresión LEF I-V (consolidado Bloque V → IV → III → II → I → M1, typecheck/lint/build) | **PASS** |
| Incremento 2 — Integración de proveedor, PARTE A determinista (PARTE B excluida) | **PASS** |
| Incremento 1 — Fundación conversacional | **PASS** |
| Incremento 3 — Cuotas, idempotencia y control de coste | **PASS** |
| Incremento 3 — Carreras de admisión de cuota/turnos (`29088e7`) | **PASS** |
| Incremento 4 — Contexto académico mínimo | **PASS** |
| Incremento 5 — Comportamiento pedagógico (garantías deterministas) | **PASS** |
| Incremento 6 — Seguridad general y reportes de respuesta | **PASS** |
| Garantía permanente de bloque — aislamiento del `answerKey`/pauta oficial (§29.2) | **PASS** |
| Incremento 7 — Privacidad, retención y borrado | **PASS** |
| Incremento 8 (§28.1) — `GET /ai/me/status` | **PASS** |
| Incremento 8 — Superficie móvil del Tutor IA | **PASS** |
| **Gate consolidado Bloque VI (LEF, Tutor IA)** | **PASS** |

Cero verificaciones en FALLO. Nueve verificaciones de identidad de proceso confirmadas (`provider=fake`, `impl=FakeAiProvider`) antes de los bloques que levantan backend. **Cero llamadas reales a Anthropic** en toda la corrida: la PARTE B del gate de integración se excluye de forma estructural (se le niegan simultáneamente la API key y la base URL).

**Ejecuciones independientes de la misma corrida de cierre**:

- `verify-ai-anthropic-integration-gate` (**solo PARTE A**, sin `ANTHROPIC_API_KEY` en el entorno del proceso): **PASS**, con `A14a` corregido en OK y `A14b`/`A14c`/`A14d` en OK. PARTE B en SKIP explícito.
- `verify-ai-answerkey-isolation-gate` (completo, backend real + Postgres real + `FakeAiProvider`, identidad de proceso confirmada): **PASS**, incluidos el control positivo anti-falso-negativo, el aislamiento cross-cuenta y las verificaciones estáticas del builder.

**Nota de transparencia sobre una corrida previa descartada**: una primera ejecución del consolidado falló en un único check del gate de otorgamiento de XP de Bloque I (`attempts == 1 en el primer intento`), ajeno a este bloque y a los cambios de esta sesión. La causa es una carrera conocida del propio gate: el `XpGrantScheduler` corre con `@Cron(EVERY_MINUTE)` dentro del backend levantado, y un tick puede incrementar el contador de intentos entre la creación de la actividad y el relay manual del gate. La re-ejecución completa quedó en PASS sin tocar nada. Se deja constancia en vez de omitirlo; **no** se clasifica como deuda de Bloque VI, sino como fragilidad conocida de un gate de Bloque I.

**Los ocho Decision Gates de bloque (§18 de la definición)**: siete verificados en PASS. El **Decision Gate 3** (actividad protegida activa) **no es verificable hoy** por ausencia de dominio canónico real y queda diferido junto con la decisión F (§4.2, deuda 3) — se declara así explícitamente, nunca se da por satisfecho.

## 19. Confirmación: ningún sistema cerrado fue reabierto

Verificado al cierre: **ADR-0022**, **DG-1** y **Gate C5** intactos. La reconciliación de I6 (**§26**) no se reabrió. La reconciliación E/F (**§29**) permanece vigente y no se reabrió — la corrección de `A14a` se diseñó explícitamente para no reintroducir la equivalencia retirada. Ninguna decisión A-Q fue reinterpretada silenciosamente. Ningún sistema de Bloques I-V fue modificado (la regresión consolidada I-V está en PASS). Los artefactos históricos de `AXIOMA_TUTOR_V3`, `V4`, `V5` y `V6` —prompts, rúbricas, datasets y resultados— permanecen **congelados e intactos**, incluido el criterio pre-registrado de `W01-CAUSAL-ANALYSIS.md` §12. **Bloque VII (Plataforma Editorial) no se inició.**

## 20. Estado final

> **APROBADO / CERRADO — LEF Bloque VI (Tutor IA).**
>
> El Product Owner declaró el Bloque VI **APROBADO / CERRADO** el 2026-08-14, sobre la base de: los ocho incrementos implementados y gateados individualmente; el gate consolidado del bloque en **PASS** de extremo a extremo, incluida la regresión completa LEF I-V; siete de los ocho Decision Gates de bloque en PASS y el octavo (Decision Gate 3) formalmente **diferido** junto con la decisión F; la evidencia pedagógica real de `AXIOMA_TUTOR_V6_1` en PASS **en el subset ejecutado y con el alcance exacto declarado en §14** — 5 casos, todos `WORKED_SOLUTION` (W01×5 + M07 + C05 + L05 + H05 + R01, más el control de coherencia intra-modo), **nunca una reevaluación transversal de todos los modos**; y las diez deudas de §17, ninguna clasificada como bloqueante.
>
> **La aprobación no reescribe ni reinterpreta ningún resultado histórico.** `AXIOMA_TUTOR_V3`, `V4`, `V5` y `V6` permanecen FAIL bajo sus propias rúbricas congeladas, exactamente como se ejecutaron y evaluaron. La desviación aceptada del protocolo pre-registrado de reevaluación de V6_1 (§14.1, §30.1) queda documentada como tal, no como cumplimiento literal. Sigue vigente el requisito de §19.9 de la definición: la evidencia pedagógica real, con el alcance exacto citado en este documento, es condición previa a cualquier **habilitación amplia del Tutor a estudiantes reales**. El Decision Gate 3 y la decisión F permanecen **diferidos**, no satisfechos ni revocados.
