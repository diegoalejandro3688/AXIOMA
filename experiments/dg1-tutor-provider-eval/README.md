# DG-1 Evaluation Harness — Tutor Axioma V1

Evidencia puntual para resolver **DG-1** (selección de proveedor/modelo y frontera de ejecución AI) del Bloque V — Tutor IA: Fundación. **No es** el subsistema `ai_quality_evaluation` de producción descrito en `datamodel.txt` Bloque 15 §15.30-15.31 — ese sigue sin construirse, deliberadamente.

## Qué es y qué no es

- Es: un experimento desechable que compara `claude-sonnet-5` y `gpt-5.6-terra` contra el mismo dataset y rubric, para informar una decisión de arquitectura/producto. `gemini-2.5-pro` fue evaluado como candidato y **retirado del harness live** -- ver "Elegibilidad de proveedores" abajo.
- No es: la implementación de la frontera `AI domain → provider abstraction → provider adapter → external provider`. Los adapters en `adapters/` son **experimentales** — no entran a `apps/backend/src`, no crean modelos Prisma, no crean endpoints, no tocan mobile.

## Qué se versiona y qué no

| Versionado (Git) | Artefacto de ejecución (gitignored, `output/`) |
|---|---|
| `dataset/cases.json`, `dataset/pedagogical-policy.json` | Respuestas completas crudas de cada proveedor |
| `rubric.json` | Payloads exactos enviados (fuera del ejemplo conceptual del dry-run) |
| `manifest.json` (candidatos, pricing, techo de costo) | Trazas detalladas por llamada |
| `schemas/*.json` | |
| `harness.mjs`, `adapters/*.mjs`, `test-local.mjs` | |
| `results/*.json` — resúmenes agregados (scores, latencia, costo, éxito/fallo) SIN el texto de la respuesta | |

`results/` solo contiene lo necesario para reproducibilidad (qué se ejecutó, con qué configuración, qué puntaje objetivo dio). El texto completo de cada respuesta vive únicamente en `output/`, que está en `.gitignore` y se trata como temporal.

## Elegibilidad de proveedores (Gate previo al harness)

`gemini-2.5-pro` (Gemini Developer API) fue evaluado y **retirado del harness live** por decisión del Product Lead: los Gemini API Additional Terms (vigentes desde 2026-03-23) exigen 18+ para quien usa la API y prohíben que el servicio forme parte de una app dirigida a, o probablemente accesible por, menores de 18 -- incompatible con la audiencia de Axioma. Clasificado en `manifest.json` → `excludedFromRound1` como `DISQUALIFIED_FOR_AXIOMA_UNDER_CURRENT_GEMINI_DEVELOPER_API_TERMS`. Solo se reabrirá con evidencia contractual oficial específica (ej. una vía empresarial de Google que lo permita explícitamente) -- no se investigó Vertex/Enterprise a fondo dentro de DG-1 por instrucción explícita.

Anthropic y OpenAI permiten servir a menores bajo safeguards adicionales (disclosure de IA, y en el caso de OpenAI, consentimiento parental/tutor obligatorio) -- ver DG-1 Provider Eligibility Addendum. Esos requisitos son trabajo de producto para Bloque VI, no bloquean el harness (dataset 100% sintético, sin usuarios reales).

## Credenciales

El harness lee **dos** variables de entorno, una por candidato — **nunca las imprime, nunca las incluye en `results/`, nunca las versiona**:

- `DG1_ANTHROPIC_API_KEY`
- `DG1_OPENAI_API_KEY`

`DG1_GOOGLE_API_KEY` **ya no es requisito** -- Google no forma parte del plan de ejecución y no puede invocarse, ni siquiera accidentalmente vía `--candidates`.

Si falta alguna de las dos variables requeridas, el modo `--live` falla con un mensaje claro **antes** de realizar ninguna llamada.

## Uso

### Pruebas locales (sin llamadas externas)

```bash
node test-local.mjs
```

Valida: forma del dataset (43 casos, subset crítico ~10 casos cubriendo las 5 categorías pedidas), forma del manifest (2 candidatos -- Google retirado --, pricing corregido de GPT-5.6 Terra, ausencia de `gemini-3.1-pro-preview`, variables de credenciales requeridas = exactamente Anthropic + OpenAI), tamaño del plan de ejecución, integridad de corrida parcial (`determineRunStatus`), y las funciones de scoring objetivo contra entradas sintéticas fijas.

### Dry-run (por defecto, sin llamadas externas)

```bash
node harness.mjs
# equivalente:
node harness.mjs --dry-run
```

Imprime: dataset cargado, subset crítico, candidatos exactos, un payload conceptual de ejemplo, rutas de output, número máximo de llamadas planificadas, costo máximo estimado, y confirma que se realizaron **0 llamadas externas**. Guarda un reporte en `results/dry-run-report-<timestamp>.json`.

### Ejecución real (NO autorizada todavía)

```bash
node harness.mjs --live --i-confirm-live-run
# opcional: limitar a un subconjunto de candidatos
node harness.mjs --live --i-confirm-live-run --candidates=anthropic-claude-sonnet-5
```

Requiere `--live` **y** `--i-confirm-live-run` explícitos — cualquiera de los dos solo no ejecuta nada. Antes de la primera llamada: verifica que existan las credenciales necesarias y que el costo máximo estimado del plan esté dentro del techo (`manifest.costCeilingUsd`, hoy $10 USD). Durante la ejecución, si el costo acumulado real supera el techo, se detiene inmediatamente.

## Plan de ejecución (dataset actual, tras retirar Google)

- Ronda completa: 43 casos × 2 candidatos = 86 llamadas.
- Subset crítico repetido: 10 casos × 2 candidatos × 2 repeticiones adicionales = 40 llamadas.
- Máximo total: 126 llamadas.
- Costo máximo estimado (supuesto conservador de tokens, precio más alto de cada candidato): muy por debajo del techo de $10 — ver salida exacta de `node harness.mjs` (dry-run).

## Candidatos de la ronda 1 (fijados por el Product Lead)

| Candidato | Provider | Model ID exacto |
|---|---|---|
| Anthropic | `anthropic` | `claude-sonnet-5` |
| OpenAI | `openai` | `gpt-5.6-terra` |

`gemini-2.5-pro` (`DISQUALIFIED_FOR_AXIOMA_UNDER_CURRENT_GEMINI_DEVELOPER_API_TERMS`) y `gemini-3.1-pro-preview` (preview, sin GA) quedan explícitamente fuera de esta ronda — ver `manifest.json` → `excludedFromRound1`.
