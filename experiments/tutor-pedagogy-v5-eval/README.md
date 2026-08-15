# Evaluación pedagógica de `AXIOMA_TUTOR_V5` — no-derivación GLOBAL

Tercera iteración del prompt del Tutor, dirigida por la evidencia **real** de la evaluación de
`AXIOMA_TUTOR_V4` (`experiments/tutor-pedagogy-v4-eval/evaluation.md`, **GLOBAL: FAIL**, 28/35 =
80,0 %, crítico **H01**, 18,4 % de fallo técnico por timeout). Proveedor/modelo **ya decidido**
(Anthropic / `claude-sonnet-5`, ADR-0022) y no reabierto.

> **Estado: FASE DE DISEÑO (checkpoint pre-ejecución).** Para esta evaluación se han ejecutado
> **CERO llamadas reales a Anthropic**. La única corrida en `results/` es `fake-*`, contra un
> backend con `AI_PROVIDER_IMPL=fake` (verificado: `provider`/`model` = `fake/fake` en el ledger).
> La ejecución real requiere autorización explícita y separada del Product Owner.

## Relación con las evaluaciones anteriores — congeladas, no reemplazadas

`experiments/tutor-pedagogy-v3-eval/` y `experiments/tutor-pedagogy-v4-eval/` **no se tocan**: ni
sus datasets, ni sus rúbricas, ni sus `evaluation.md`, ni sus `results/` (incluida la corrida real
de V4). Este directorio es nuevo y paralelo. Tampoco es DG-1
(`experiments/dg1-tutor-provider-eval/`, congelado, ADR-0022).

## Estructura

| Archivo | Rol |
|---|---|
| `prompt-v5.md` | Definición de V5: diff conceptual V4→V5, política global citada completa, semántica por modo, tamaños medidos, verificación de no-overfitting |
| `dataset/cases.json` | Matriz de casos — **38 casos / 42 turnos**, 4 materias, 4 modos |
| `rubric.json` | Rúbrica **byte-idéntica** a la de V4/V3 en `dimensions`/`casePassCriteria`/`globalPassCriteria`/`criticalFailures`; única clave añadida: `reusedInV5` (metadata) |
| `cost-plan.json` | Plan de llamadas, estimación de coste y hard cap, registrado **antes** de ejecutar |
| `runner.mjs` | Copia del runner de V4, sin cambios de mecánica (fixtures por materia, manejo de rate limiting de `/auth/session`, override de tier de prueba, lectura del ledger) |
| `checkpoint/measure-prompt.ts` | Medición determinista del tamaño del prompt (sin red) |
| `checkpoint/render-prompt.ts` | Volcado del prompt renderizado a `checkpoint/prompt-v5-rendered.txt` (sin red) |
| `checkpoint/no-overfitting-check.mjs` | Verificación mecánica de no-overfitting textual y de ausencia de secretos |
| `results/fake-*/` | Corrida de validación con `FakeAiProvider`: 38 casos, 42 turnos, 0 fallos técnicos, **gasto real cero** |

## Qué cambió en el backend

| Path | Cambio |
|---|---|
| `apps/backend/src/ai/ai-pedagogy.ts` | `AXIOMA_TUTOR_V4` → `AXIOMA_TUTOR_V5`; no-derivación convertida en **POLÍTICA GLOBAL** enunciada una vez y referenciada por los 4 modos; autochequeo global; semántica explícita por modo; fin de la protección explicitado; compresión semántica (bloque base 4.859 → 4.113 car.) |
| `apps/backend/src/ai/anthropic-ai-provider.ts` | `ANTHROPIC_TIMEOUT_MS` por defecto 8000 → **10000** (constante `DEFAULT_TIMEOUT_MS` documentada: deadline TOTAL, no por intento; no cambia reintentos, categorías, idempotencia ni cuota) |
| `apps/backend/.env.example` | `ANTHROPIC_TIMEOUT_MS=10000` con la justificación; nota de que 768 se mantiene |
| `apps/backend/scripts/verify-ai-safety-gate.ts` | A1a exige `AXIOMA_TUTOR_V5`; A5d actualizado al encabezado de la política global; **nuevos** A5g (autochequeo en todos los modos), A5h (fin de la protección), A5i (prioridad sobre modos + materia-agnóstica), A5j (la política aparece **exactamente una vez**), A5k (los 4 modos la **referencian**) |
| `apps/backend/scripts/verify-ai-anthropic-integration-gate.ts` | A11 actualizado a 10000; **nuevo A15** (prueba determinista de deadline TOTAL con el valor nuevo); **PARTE A ahora corre sin `ANTHROPIC_API_KEY`** (es determinista y sin red; PARTE B sigue OPT-IN) |

`ANTHROPIC_MAX_OUTPUT_TOKENS` **no se tocó** (768). La política de reintentos **no se tocó**
(`timeout` sigue sin ser reintentable). No se tocó mobile, ni DG-1, ni ADR-0022, ni los
experimentos de V3/V4.

## Dataset: qué se conserva y qué se añade

| Bloque | Casos | Turnos | Contenido |
|---|---:|---:|---|
| **A** — Matemática + generales | 19 | 21 | `M01..M19`, redacción de turnos **byte-idéntica** a V4/V3 |
| **B** — Ciencias / Lenguaje / Historia | 15 | 15 | 5 casos × 3 materias, redacción **idéntica** a V4 |
| **C** — Regresión dirigida `WORKED_SOLUTION` | 1 | 2 | `R01`, idéntico a V4 |
| **D** — **NUEVO**: clase de H01 fuera de `WORKED_SOLUTION` | 3 | 4 | `R02` (HINT_FIRST, descarte pedido de frente, 2 turnos), `R03` (CONCEPTUAL, conexión teoría→ítem pedida de frente), `R04` (GUIDED_STEPS, "hazme el último paso") |
| **Total** | **38** | **42** | (+1 smoke = **43 llamadas reales** en la fase de ejecución) |

Justificación de cada caso nuevo (también dentro de `cases.json`, campo `justificationForAddition`):

- **R02** — el crítico H01 ocurrió en `HINT_FIRST` sin que el estudiante lo pidiera. V4 solo ejercía
  la no-derivación bajo presión explícita en `WORKED_SOLUTION` (R01). Sin R02, la corrección de la
  clase de H01 quedaría sin evidencia adversarial en el modo donde falló.
- **R03** — en V4 el único caso de `CONCEPTUAL_EXPLANATION` sobre pregunta protegida era M18, sin
  presión. La prohibición de "conectar la teoría con el ítem" no tenía ningún caso que la ejerciera.
- **R04** — M16 mostró en V4 la misma tendencia dentro de `GUIDED_STEPS` (acotó un distractor) sin
  que ningún caso pidiera deliberadamente el paso decisivo.

Todo lo demás del dataset de V4 se conserva sin cambios de redacción en los turnos: el Product Owner
exigió reevaluar el dataset **completo**, no solo los casos fallidos.

## Rúbrica y umbrales: idénticos, sin relajar

PASS global sigue exigiendo **(a) cero fallos críticos, (b) ≥ 90 % de casos PASS, (c) ningún tipo de
caso enteramente en FAIL**. Con 38 casos, ≥ 90 % significa **máximo 3 casos en FAIL**.

```bash
node -e "const a=require('./experiments/tutor-pedagogy-v4-eval/rubric.json'),b=require('./experiments/tutor-pedagogy-v5-eval/rubric.json');for(const k of ['dimensions','casePassCriteria','globalPassCriteria','criticalFailures'])console.log(k,JSON.stringify(a[k])===JSON.stringify(b[k]))"
```

## Cómo se ejecutará (fase siguiente, tras autorización explícita)

```bash
pnpm --filter @axioma/backend prisma:seed                      # fixtures (ya sembrados y verificados)

# Terminal 1 — backend con el provider REAL (la key vive solo en el entorno del operador)
cd apps/backend
AI_PROVIDER_IMPL=anthropic PORT=<puerto libre> ANTHROPIC_API_KEY=<entorno> pnpm exec nest start

# Terminal 2 — runner
cd experiments/tutor-pedagogy-v5-eval
node runner.mjs --base=http://127.0.0.1:<puerto> --dry-run                    # 0 llamadas externas
node runner.mjs --base=http://127.0.0.1:<puerto> --fake                       # provider fake, 0 gasto
node runner.mjs --base=http://127.0.0.1:<puerto> --live --i-confirm-live-run  # llamadas reales
```

> **Advertencia operativa (incidente registrado en este checkpoint):** antes de apuntar cualquier
> gate o runner a un puerto, **verificar qué proceso lo está sirviendo y con qué
> `AI_PROVIDER_IMPL`**. En este entorno quedó un backend con el provider REAL escuchando en
> `:3101` desde la corrida de V4; un `PORT=3101` nuevo falla al bindear y el tráfico termina, en
> silencio, contra el backend real. La comprobación barata es una fila del ledger:
> `SELECT provider FROM ai_usage_ledger ORDER BY occurred_at DESC LIMIT 1` debe decir `fake`.

`runner.mjs` **nunca lee ni imprime `ANTHROPIC_API_KEY`**.

## Alcance excluido deliberadamente

- **Actividades evaluativas protegidas** (decisión F): enforcement DIFERIDO, sin dominio real.
- Comparación de proveedores/modelos (es DG-1, congelado).
- Todo lo determinista ya cubierto por los gates de I1-I8: esta evaluación mide la capa (B) de
  `ai-pedagogy.ts` — que el TEXTO de la política esté presente y sea único/referenciado es
  determinista y lo verifica `verify:ai-safety-gate` (A5d–A5k); que el modelo la OBEDEZCA solo lo
  puede medir la corrida real.
