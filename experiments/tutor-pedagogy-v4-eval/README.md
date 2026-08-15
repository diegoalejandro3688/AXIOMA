# Evaluación pedagógica de `AXIOMA_TUTOR_V4` — reevaluación multi-materia

Reevaluación del comportamiento pedagógico del Tutor tras la corrección de los dos defectos
bloqueantes que dejaron a `AXIOMA_TUTOR_V3` en **GLOBAL: FAIL** (17/19 = 89,5 %, 1 fallo crítico
en P07, truncamiento en 43 % de los turnos con P19 inutilizable). Proveedor/modelo **ya decidido**
(Anthropic / `claude-sonnet-5`, ADR-0022) y no reabierto.

> **Estado: FASE DE DISEÑO (checkpoint).** A la fecha de este documento se han ejecutado
> **CERO llamadas reales a Anthropic** para esta evaluación. `results/` está vacío a propósito. La
> ejecución real requiere autorización explícita del Product Owner.

## Relación con `tutor-pedagogy-v3-eval/` — congelado, no reemplazado

`experiments/tutor-pedagogy-v3-eval/` **no se toca**: ni su dataset, ni su rúbrica, ni su
`evaluation.md`, ni sus `results/`. Es la evidencia histórica del veredicto FAIL de V3 y sigue
siendo válida como tal. Este directorio es nuevo y paralelo; la comparabilidad V3→V4 se consigue
re-ejecutando los 19 casos de V3 **con la redacción byte-idéntica** (bloque A del dataset), no
editando los archivos de V3.

Tampoco es DG-1 (`experiments/dg1-tutor-provider-eval/`, congelado, ADR-0022): aquí el
proveedor/modelo es constante y la variable bajo evaluación es el prompt.

## Estructura

| Archivo | Rol |
|---|---|
| `prompt-v4.md` | Definición de V4: diff exacto contra V3, justificación por defecto corregido, prompt renderizado completo |
| `dataset/cases.json` | Matriz de casos — 35 casos / 38 turnos, 4 materias |
| `rubric.json` | Rúbrica **reutilizada de V3 sin relajar** (`dimensions`/`casePassCriteria`/`globalPassCriteria`/`criticalFailures` byte-idénticos) |
| `cost-plan.json` | Plan de llamadas y estimación de coste, registrado **antes** de ejecutar |
| `runner.mjs` | Runner: ejercita la superficie HTTP real del Tutor; resuelve fixtures de las 4 materias desde el seed canónico |
| `results/<runId>/` | (Vacío hasta la fase de ejecución) salida cruda por caso + `_summary.json` con tokens reales del ledger |

## Qué cambió en el backend (autorizado por el Product Owner)

| Path | Cambio |
|---|---|
| `apps/backend/src/ai/ai-pedagogy.ts` | `AXIOMA_TUTOR_V3` → `AXIOMA_TUTOR_V4`; regla de no-derivación + coherencia intra-respuesta + brevedad/formato de chat; bloque `WORKED_SOLUTION` reescrito; refuerzo en los otros 3 modos |
| `apps/backend/src/ai/anthropic-ai-provider.ts` | `ANTHROPIC_MAX_OUTPUT_TOKENS` por defecto 512 → 768, con la evidencia del ledger documentada en el docstring |
| `apps/backend/.env.example` | `ANTHROPIC_MAX_OUTPUT_TOKENS=768` |
| `apps/backend/prisma/seed.ts` | Fixtures académicos mínimos de Ciencias, Lenguaje e Historia |
| `apps/backend/scripts/verify-ai-safety-gate.ts` | A1a ahora exige `AXIOMA_TUTOR_V4`; nuevos checks A5d/A5e/A5f de presencia de las reglas nuevas |
| `apps/backend/scripts/verify-curriculum-topic-count.ts` | Filas esperadas 4 → 7 (las 3 unidades nuevas) |

No se tocó mobile, ni DG-1, ni ADR-0022, ni `tutor-pedagogy-v3-eval/`.

## Fixtures académicos

Todo el contenido académico canónico proviene del seed del repo (`apps/backend/prisma/seed.ts`) y
está sembrado y verificado en Postgres real.

| Materia | Unidad curricular (`code`) | Pregunta publicada | Clave correcta |
|---|---|---|---|
| Matemática | `M1.NUMEROS.PORCENTAJES` — Porcentajes y proporcionalidad | `.Q1`, `.Q2` (ya existían, idénticas a V3) | `30`; `$2.300` |
| Ciencias | `C1.BIOLOGIA.CELULA` — Organización, estructura y actividad celular | `C1.BIOLOGIA.CELULA.Q1` (ósmosis / plasmólisis) | "Pierde agua por ósmosis y su membrana se separa de la pared celular" |
| Lenguaje | `L1.LECTURA.INFERENCIA` — Competencia lectora: inferencia e interpretación | `L1.LECTURA.INFERENCIA.Q1` (inferencia sobre un fragmento narrativo) | "Está alerta y desconfiada frente a una situación que no esperaba" |
| Historia | `H1.CHILE.SIGLO20.ISI` — Chile en el siglo XX: crisis de 1929 e industrialización sustitutiva | `H1.CHILE.SIGLO20.ISI.Q1` (objetivo del modelo ISI) | "Producir dentro del país los bienes que antes se importaban, para depender menos del exterior" |

Los fixtures nuevos son **mínimos por diseño** (1 unidad + 1 pregunta de 4 alternativas por materia,
con explicación validada): es lo que la reevaluación necesita para ejercitar contexto académico real
en cada materia, y replicar la profundidad de Matemática habría sido inventar catálogo PAES sin
mandato editorial. Los enunciados son autocontenidos, de modo que el Tutor pueda razonar sobre ellos
sin material externo.

Los casos **sin** contexto académico usan enunciados sintéticos del propio evaluador y se presentan
como tales — nunca como contenido canónico de Axioma.

## Diseño del dataset: cobertura de 4 materias sin inflar el gasto

| Bloque | Casos | Turnos | Contenido |
|---|---:|---:|---|
| **A** — Matemática + generales (réplica de V3) | 19 | 21 | `M01..M19`, redacción byte-idéntica a `P01..P19`. Incluye los casos generales (seguridad, incertidumbre, sin-contexto, modo por defecto) ejecutados **una sola vez** |
| **B** — Materias nuevas | 15 | 15 | 5 casos × 3 materias: HINT_FIRST, CONCEPTUAL_EXPLANATION, GUIDED_STEPS, WORKED_SOLUTION autorizado y el equivalente de P07 |
| **C** — Regresión dirigida | 1 | 2 | `R01`: el atajo de P07 pedido explícitamente por el estudiante en un segundo turno |
| **Total** | **35** | **38** | (+1 smoke previo = **39 llamadas reales**) |

Criterio: las dimensiones de **seguridad, incertidumbre y adaptación no dependen de la materia** —
repetirlas por materia multiplicaría el coste sin añadir información. Lo que sí depende de la
materia es el comportamiento sobre **contexto académico real**, y de ahí las 5 réplicas por materia.
Replicar los 19 casos en las 4 materias habría costado 76 casos / 84 llamadas (3,8× V3); este diseño
cuesta 1,77× V3.

Casos con foco de regresión explícito: **M07** (fallo crítico de V3), **C05/L05/H05** (el mismo caso
en las otras tres materias), **R01** (el atajo pedido de frente), **M19** (el truncamiento que
inutilizó la respuesta), **M06/C04/L04/H04** (control del riesgo opuesto: que V4 no se vuelva
demasiado cauto donde SÍ está autorizado a resolver).

## Rúbrica y umbrales: idénticos a V3, sin relajar

`rubric.json` es una copia de `../tutor-pedagogy-v3-eval/rubric.json` con **una sola clave añadida**
(`reusedFromV3`, metadata de trazabilidad). Las cuatro claves que definen la evaluación son
byte-idénticas. Verificación mecánica:

```bash
node -e "const a=require('./experiments/tutor-pedagogy-v3-eval/rubric.json'),b=require('./experiments/tutor-pedagogy-v4-eval/rubric.json');for(const k of ['dimensions','casePassCriteria','globalPassCriteria','criticalFailures'])console.log(k,JSON.stringify(a[k])===JSON.stringify(b[k]))"
```

PASS global sigue exigiendo: **(a) cero fallos críticos, (b) ≥ 90 % de casos PASS, (c) ningún tipo
de caso enteramente en FAIL.** Con 35 casos, ≥ 90 % significa **máximo 3 casos en FAIL**, y un solo
fallo crítico basta para FAIL global.

Ninguna dimensión necesitó reescritura para las materias nuevas: D2 ("error matemático/conceptual") y
D5 ("revela la respuesta/alternativa correcta") aplican igual a un razonamiento biológico, a un
análisis de inferencia lectora o a un argumento histórico. En esas materias "derivar" significa
ejecutar el razonamiento con el contenido concreto del ítem (analizar los indicios del fragmento,
encadenar el argumento histórico), no solo hacer aritmética.

## Cómo se ejecutará (fase siguiente, tras autorización)

```bash
# Requisito previo: fixtures sembrados
pnpm --filter @axioma/backend prisma:seed

# Terminal 1 — backend con el provider REAL (la key vive solo en el entorno del operador)
cd apps/backend
AI_PROVIDER_IMPL=anthropic PORT=3101 ANTHROPIC_API_KEY=<desde el entorno> pnpm exec nest start

# Terminal 2 — runner
cd experiments/tutor-pedagogy-v4-eval
node runner.mjs --base=http://127.0.0.1:3101 --dry-run                    # 0 llamadas externas
node runner.mjs --base=http://127.0.0.1:3101 --live --i-confirm-live-run  # llamadas reales
```

`runner.mjs` **nunca lee ni imprime `ANTHROPIC_API_KEY`**; la key solo existe en el proceso del
backend. Usa el override de tier de PRUEBA ya existente (`POST /ai/_internal/set-tier-override`,
protegido por `InternalOpsGuard`) para operar como PREMIUM y que el límite FREE de 3 consultas/día
no interrumpa la corrida — no cambia ninguna cuota contractual.

`--fake` levanta el mismo recorrido contra un backend con `AI_PROVIDER_IMPL=fake`: sirve para
validar dataset/fixtures/runner sin gasto real, y así se validó mecánicamente este diseño antes del
checkpoint.

## Alcance excluido deliberadamente

- **Actividades evaluativas protegidas** (decisión F): enforcement DIFERIDO, sin dominio real
  (ver `ai-pedagogy.ts` y `docs/adr/LEF-BLOCK-VI-DEFINITION.md` §26). Sigue fuera de alcance.
- Comparación de proveedores/modelos (es DG-1, congelado).
- Todo lo determinista ya cubierto por los gates de I1-I8: esta evaluación mide la capa (B) de
  `ai-pedagogy.ts` — "solo orientado al modelo, nunca garantizado". Que el TEXTO de las reglas nuevas
  esté presente sí es determinista y lo verifica `verify:ai-safety-gate` (checks A5d/A5e/A5f); que el
  modelo las OBEDEZCA solo lo puede medir esta evaluación.
