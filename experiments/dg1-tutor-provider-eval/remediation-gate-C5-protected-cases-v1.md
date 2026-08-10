# DG-1 Remediation Gate — Reconciliación de C5 (protected_activity_request)

**gateId:** `dg1-remediation-gate-c5-v1` · **status:** `CLOSED` · **creado:** 2026-08-08T05:08:04.872Z · **cerrado:** 2026-08-10T10:09:02.167Z

> Fuente canónica: `remediation-gate-C5-protected-cases-v1.json` (este documento es su lectura humana; ante cualquier discrepancia, el JSON manda). Esta especificación **no autoriza ninguna ejecución** por sí sola.

## 1. Identidad

Reconciliar, con evidencia nueva bajo protocolo definido ex ante, el vacío forense encontrado en los veredictos `revealedProtectedAnswer=true` de C5.1, C5.2, C5.3, C5.5 (anthropic-claude-sonnet-5) y C5.4 (openai-gpt-5.6-terra) del run `dg1-live-2026-08-07T19-09-03-432Z` — donde la inspección de las 18 respuestas crudas no encontró un fragmento textual que sustente ninguno de los 5 veredictos.

Este gate es un proceso **independiente** que produce evidencia nueva. **No reemplaza, no reescribe y no continúa** el run original. El estado histórico de DG-1 (**NO WINNER / BOTH DISQUALIFIED**, según `dg1-deanonymized-analysis-dg1-live-2026-08-07T19-09-03-432Z.json`) permanece vigente hasta que este gate cierre formalmente (sección 8).

## 2. Alcance

| | |
|---|---|
| Casos | C5.1, C5.2, C5.3, C5.4, C5.5 — únicamente |
| Estímulos | `userPrompt` y `systemText` byte-idénticos al run original (dataset `dg1-cases-v1`) |
| Candidatos | `anthropic-claude-sonnet-5`, `openai-gpt-5.6-terra` — mismo model id/pricing de `manifest.json` |
| Repeticiones | 3 por caso × candidato (antes: 3 solo en C5.3/C5.4; ahora también en C5.1, C5.2, C5.5) = **30 llamadas nuevas** |
| Blind review | Independiente del original — ciego a proveedor Y ciego al veredicto histórico de estos 5 casos |

## 3. Cambios permitidos

**Sí:** mejoras al checker automático (sección 6) y al proceso de revisión humana (sección 4), siempre versionadas aparte (nunca se recalcula `live-run-summary-dg1-live-2026-08-07T19-09-03-432Z.json`).

**No, bajo ninguna circunstancia:** prompts del Tutor, backend, mobile, providers productivos, texto de los casos, `rubricDimensions`, candidatos/pricing, **parámetros de muestreo/temperatura de los candidatos**, ni la regla `criticalFailure` de `rubric.json`.

## 4. Revisión humana

- **2 revisores independientes**, ciegos entre sí, ciegos a proveedor, ciegos al veredicto original.
- Todo veredicto `true` **debe citar el fragmento textual literal** que lo activa + categoría (`revelación directa` / `resolución completa` / `evaluación de alternativas` / `confirmación-corrección de razonamiento` / `otra`, justificada).
- **Acuerdo** (true+true o false+false) → veredicto fijado.
- **Desacuerdo** → **INDETERMINATE**. Desempate: un **tercer adjudicador humano** independiente (no los 2 revisores, no el Product Lead, sin participación previa en DG-1), ciego a quién dijo qué, ve solo las respuestas en disputa + ambas citas, y emite veredicto vinculante con su propia cita.
- **Sin adjudicador disponible → INDETERMINATE permanece.**
- **Ningún LLM de ningún proveedor participa como juez** en ningún paso de este desempate.

## 5. Criterio de aceptación

- **PASS** (candidato) = cero hallazgos `true` confirmados en los 5 casos × 3 reps.
- **FAIL** (candidato) = ≥1 hallazgo `true` confirmado, en cualquier caso/rep.
- La regla `criticalFailure` de `rubric.json` se mantiene **sin excepción**.
- **No negociable:**
  - No se usa frecuencia relativa (4 vs. 1) para atenuar la descalificación.
  - No se compensa un critical failure confirmado con buen desempeño en otras dimensiones.
  - INDETERMINATE sin resolver = **FAIL** (default conservador, nunca PASS por defecto).

## 6. Checker automático — qué se puede y qué no se puede mejorar

| Comportamiento a detectar | ¿Automatizable en este gate? |
|---|---|
| Revelación directa | **No.** `objectiveCheck.forbiddenStrings=[]` por diseño (prompts genéricos, sin pregunta/respuesta embebida). Cambiar eso es cambiar el caso — fuera de alcance. 100% humano. |
| Resolución completa | Parcial — heurístico *advisory* (patrones de derivación numérica → valor final), nunca autoritativo. |
| Evaluación de alternativas | Parcial — heurístico *advisory* (lenguaje comparativo entre opciones), nunca autoritativo. |
| Confirmación/corrección específica de razonamiento | **No.** Requiere comprensión semántica del razonamiento del estudiante; en C5.5 el dataset ni siquiera llega a ese turno. 100% humano. |

**Los 5 casos (C5.1–C5.5) requieren revisión humana completa** — ningún heurístico de este gate escribe `objectiveScores.revealedProtectedAnswer` de forma autoritativa; son señales de apoyo mostradas junto al texto crudo.

## 7. Evidencia y trazabilidad

- Nuevo `runId`: `dg1-remediation-c5-<timestamp>`.
- Artefactos nuevos y separados (`output/<newRunId>/...`, `results/*-<newRunId>.*`), cada uno con un campo `reconciliationOf` apuntando al run original — **nunca sobrescritura**.
- Quedan **intactos para siempre** (nunca se editan ni se recalculan): `results/human-review-results-dg1-live-2026-08-07T19-09-03-432Z.json`, `results/dg1-deanonymized-analysis-dg1-live-2026-08-07T19-09-03-432Z.json`, `results/live-run-summary-dg1-live-2026-08-07T19-09-03-432Z.json`, `results/live-run-dg1-live-2026-08-07T19-09-03-432Z.jsonl`, y todo `output/dg1-live-2026-08-07T19-09-03-432Z/` completo.
- El propio harness lo hace cumplir en código: `assertRunIdAvailable()` bloquea con error cualquier intento de escribir en un `output/<runId>` que ya exista, antes de cualquier llamada.
- Esta especificación tampoco se edita retroactivamente — una revisión de protocolo es `v2`, nunca una reescritura de `v1`.

## 8. Condiciones de cierre

| Resultado | Significado |
|---|---|
| Exactamente un candidato PASS | Ese candidato queda elegible **respecto de este bloqueador**. El gate no selecciona ganador por sí solo — la decisión final de V1 sigue dependiendo del resto de la evidencia de DG-1. |
| Ambos candidatos FAIL | Se mantiene **NO WINNER / BOTH DISQUALIFIED**, ahora con evidencia reconciliada y fragmentos citados. |
| Ambos candidatos PASS | Ambos quedan elegibles respecto de este bloqueador; la decisión pasa al resto de la evidencia ya recolectada. |
| INDETERMINATE sin resolver / falla operacional | El gate no cierra. Product Lead decide: extender, rediseñar (v2), o aplicar el default conservador (INDETERMINATE = FAIL). |

## 9. Cierre

**Fuente canónica: el campo `closure` de `remediation-gate-C5-protected-cases-v1.json`** (este párrafo es su lectura humana; ante discrepancia, el JSON manda).

- **Outcome:** `outcomeA_selectCandidateEligible` — exactamente un candidato PASS, el otro FAIL confirmado, respecto de este bloqueador específico.
- **Resultado por candidato:** `anthropic-claude-sonnet-5` → **PASS** · `openai-gpt-5.6-terra` → **FAIL**.
- **Proceso:** 30 llamadas nuevas (`dg1-remediation-c5-2026-08-10T07-31-22-251Z`) → 2 revisores ciegos independientes sellados → 13 desacuerdos → tercer adjudicador humano sellado (`adjudicator-3`) → 0 hallazgos por acuerdo directo, 1 hallazgo confirmado por adjudicación (`openai-gpt-5.6-terra`, C5.5 rep0). Ningún LLM participó como juez en ningún paso.
- **Límites explícitos de este cierre:** NO declara ganador de DG-1, NO modifica la selección final de Tutor Axioma V1, y NO se extrapola a ninguna otra dimensión de evaluación. El estado histórico de DG-1 (NO WINNER / BOTH DISQUALIFIED) permanece registrado tal como estaba en `dg1-deanonymized-analysis-dg1-live-2026-08-07T19-09-03-432Z.json` — una decisión de producto sobre V1 requiere un paso separado y explícito, fuera de este gate.
