# Evaluación pedagógica de `AXIOMA_TUTOR_V3` — cierre de LEF Bloque VI

Evidencia de **validación de producto** del comportamiento pedagógico del prompt vigente
(`AXIOMA_TUTOR_V3`, definido en `apps/backend/src/ai/ai-pedagogy.ts`) usando el
proveedor/modelo **ya decidido** (Anthropic / `claude-sonnet-5`, ADR-0022).

## Qué NO es (frontera explícita con DG-1)

No es `experiments/dg1-tutor-provider-eval/`. DG-1 resolvió **qué proveedor/modelo usar** y está
congelado: este experimento **no lo reabre, no lo cuestiona, no lo modifica** y no compara
proveedores. Aquí el proveedor/modelo es una constante dada; la variable bajo evaluación es
**el prompt y su comportamiento pedagógico observable**.

Tampoco es el subsistema `ai_quality_evaluation` de producción (Data Model §15.30-15.31), que
sigue sin construirse.

## Estructura

| Archivo | Rol |
|---|---|
| `dataset/cases.json` | Matriz de casos (19 casos, 21 turnos) — 10 tipos de caso cruzados con los 4 modos donde tiene sentido pedagógico |
| `rubric.json` | Rúbrica objetiva, **fijada antes** de ejecutar ninguna llamada real |
| `runner.mjs` | Runner: ejercita la superficie HTTP real del Tutor (I1-I8) contra un backend con `AI_PROVIDER_IMPL=anthropic` |
| `results/<runId>/<caseId>.json` | Salida cruda por caso (input completo, output completo, metadata de uso del ledger) |
| `results/<runId>/_summary.json` | Totales de la corrida (llamadas, tokens reales, fallos técnicos) |
| `evaluation.md` | Aplicación de la rúbrica caso por caso + veredicto global |

## Cómo se ejecutó (real, de punta a punta)

No se llamó al SDK de Anthropic por fuera del producto: se levantó el **backend real** con el
provider real y se ejercitaron los endpoints reales, de modo que la respuesta evaluada pasó por
el mismo camino que verá un estudiante (`AiConversationService` → `AiAcademicContextBuilder` →
`buildSystemPrompt` → `AnthropicAiProvider`).

```bash
# Terminal 1 — backend con el provider REAL (la key vive solo en el entorno del operador)
cd apps/backend
AI_PROVIDER_IMPL=anthropic PORT=3101 ANTHROPIC_API_KEY=<desde el entorno> pnpm exec nest start

# Terminal 2 — runner
cd experiments/tutor-pedagogy-v3-eval
node runner.mjs --base=http://127.0.0.1:3101 --dry-run                    # 0 llamadas externas
node runner.mjs --base=http://127.0.0.1:3101 --live --i-confirm-live-run  # llamadas reales
```

`runner.mjs` **nunca lee ni imprime `ANTHROPIC_API_KEY`**; la key solo existe en el proceso del
backend. Ningún archivo de `results/` contiene credenciales.

El runner usa el override de tier de PRUEBA ya existente (`POST /ai/_internal/set-tier-override`,
Incremento 3, protegido por `InternalOpsGuard`) para operar como PREMIUM. **No cambia ninguna
cuota contractual** — solo evita que el límite FREE de 3 consultas/día interrumpa la evaluación,
que es exactamente el propósito para el que ese interruptor de prueba fue construido.

## Fixtures académicos

Todo el contenido académico canónico proviene del seed del repo (`apps/backend/prisma/seed.ts`):

- Materia **Matemática**, unidad `M1.NUMEROS.PORCENTAJES` ("Porcentajes y proporcionalidad").
- Preguntas publicadas `M1.NUMEROS.PORCENTAJES.Q1` y `.Q2`.

Los enunciados de los casos **sin** contexto académico son sintéticos del propio evaluador y se
presentan como tales — nunca como contenido canónico de Axioma.

### Decisión pendiente del Product Owner

El repo **no tiene fixtures académicos canónicos** para Ciencias, Lenguaje ni Historia: la única
materia con seed real es Matemática. Lo único que existe con esos nombres en la base de datos de
desarrollo son residuos efímeros de gates (`Lenguaje (gate)`, `Materia de prueba ...`), sin
contenido académico real. Por eso esta evaluación cubre **solo Matemática**, y no se inventó
contenido de otras materias. Si el cierre del bloque exige cobertura multi-materia, hace falta una
decisión del Product Owner para crear fixtures canónicos de esas materias antes de reevaluar.

## Alcance excluido deliberadamente

- **Actividades evaluativas protegidas** (decisión F): su enforcement determinista está DIFERIDO
  (no existe dominio real de Prácticas/Ensayos, ver `ai-pedagogy.ts` y
  `docs/adr/LEF-BLOCK-VI-DEFINITION.md` §26). Probar esa zona produciría conclusiones sobre una
  garantía que hoy no existe.
- Comparación de proveedores/modelos (es DG-1, congelado).
- Todo lo determinista ya cubierto por los gates de I1-I8 (versión de prompt trazable, modo por
  defecto, idempotencia, cuotas, `AI_SAFETY_BLOCKED`, retención): esta evaluación mide la capa
  (B) de `ai-pedagogy.ts` — "solo orientado al modelo, nunca garantizado".
