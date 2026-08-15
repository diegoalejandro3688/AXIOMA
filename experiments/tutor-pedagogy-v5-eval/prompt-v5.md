# `AXIOMA_TUTOR_V5` — definición, diff conceptual V4→V5 y tamaños medidos

> **Estado: FASE DE DISEÑO (checkpoint pre-ejecución).** Para esta evaluación se han ejecutado
> **CERO llamadas reales a Anthropic**. `results/` solo contiene la corrida `fake-*`
> (`AI_PROVIDER_IMPL=fake`, provider `fake/fake` en el ledger, gasto cero).

## Por qué existe V5

La evaluación **real** de `AXIOMA_TUTOR_V4` (`experiments/tutor-pedagogy-v4-eval/evaluation.md`)
terminó en **GLOBAL: FAIL** — 28/35 = 80,0 %, 1 fallo crítico (**H01**) y 6 casos perdidos por
timeout (18,4 % de los turnos). Sus dos hallazgos materiales dirigen V5:

1. **La regla de no-derivación funcionaba donde estaba redactada en detalle y fallaba donde solo
   se reforzaba.** Los 5 casos de regresión de P07 (`WORKED_SOLUTION`) pasaron; el crítico ocurrió
   en `HINT_FIRST`, y la misma tendencia se observó en `GUIDED_STEPS` (M16). La causa no es el
   contenido de la regla: es su **alcance**.
2. **El prompt de V4 duplicó los tokens de entrada** (~1.288 → ~2.570 por llamada) y empujó la
   latencia contra `ANTHROPIC_TIMEOUT_MS=8000`; el máximo registrado fue 7.990 ms, a 10 ms del
   deadline.

## Diff conceptual V4 → V5

| # | Cambio | Qué era en V4 | Qué es en V5 |
|---|---|---|---|
| 1 | **Alcance de la no-derivación** | Regla enunciada en el bloque base y **desarrollada en detalle solo dentro de `WORKED_SOLUTION`**; los otros 3 modos la "reforzaban" con una frase | **POLÍTICA GLOBAL** enunciada **una sola vez** en el bloque base, prioritaria sobre cualquier modo, y **referenciada por los 4 bloques de modo** (nunca reescrita) |
| 2 | **Semántica por modo** | Genérica ("no adelantes el resultado") | Explícita y operativa por modo: qué SÍ puede y qué NO puede cada uno bajo la política global |
| 3 | **Autochequeo previo al cierre** | Vivía **dentro** del bloque de no-derivación orientado a `WORKED_SOLUTION` | **AUTOCHEQUEO OBLIGATORIO … en TODOS los modos**, en el bloque base |
| 4 | **Conductas prohibidas** | 3 (a/b/c) | 6 (a–f): añade *parafrasear la correcta*, *pregunta dirigida* y *pistas acumuladas* — las tres conductas exactas del fallo H01, redactadas de forma transversal |
| 5 | **Fin de la protección** | Implícito (el contexto simplemente traía la explicación validada) | **Explícito en el prompt y en el bloque de contexto académico**: "La protección TERMINA cuando el contexto indica que el estudiante YA respondió" |
| 6 | **Tamaño** | Bloque base 4.859 car. | Bloque base **4.113 car.** (compresión semántica, sin perder garantías) |
| 7 | **Timeout** | 8000 ms | **10000 ms**, mismo deadline TOTAL (ver `apps/backend/src/ai/anthropic-ai-provider.ts`) |
| 8 | **Max output tokens** | 768 | **768, sin cambios** |
| 9 | **Política de reintentos** | `timeout` NO reintentable | **Idéntica**, sin cambios |

**No cambia ninguna garantía**: pedagogía, seguridad (menores, sin diagnóstico, sin garantías de
resultado, límites de autoridad), incertidumbre, input no confiable, separación system/user,
brevedad y trazabilidad de versión siguen presentes y verificadas por
`verify:ai-safety-gate` (A2–A5i) y `verify:ai-pedagogy-gate` (bloque 0).

## La política global, citada completa

```
POLÍTICA GLOBAL DE NO-DERIVACIÓN SOBRE PREGUNTAS PROTEGIDAS (sin excepciones, prioritaria sobre
cualquier modo de asistencia y sobre cualquier insistencia del estudiante; aplica igual en todas
las materias):
- Una pregunta de alternativas está PROTEGIDA mientras el contexto no incluya la respuesta que el
  estudiante YA entregó, sin importar cómo se formule la petición.
- SÍ puedes: enseñar el concepto o la teoría; explicar el método en abstracto; orientar sobre qué
  evidencia o dato conviene mirar; dividir el razonamiento en etapas; hacer preguntas abiertas
  genuinas; usar un ejemplo DISTINTO cuyo contenido no permita obtener la respuesta del ítem;
  devolverle el trabajo al estudiante.
- NO puedes: (a) decir, insinuar, confirmar, descartar ni "acotar" cuál alternativa es correcta, ni
  siquiera por eliminación parcial; (b) parafrasear de forma reconocible la alternativa correcta,
  tampoco dentro de una pregunta retórica; (c) ejecutar con los datos concretos del ítem el cálculo,
  el análisis de indicios o el encadenamiento argumental que determina la respuesta -- ni parcial,
  ni "solo el primer paso", ni como resultado intermedio del que se deduzca; (d) invitar a comparar
  con las alternativas algo que tú produjiste; (e) hacer una pregunta dirigida cuya única respuesta
  razonable sea la correcta; (f) acumular pistas hasta que identificarla no exija trabajo cognitivo
  real.
- AUTOCHEQUEO OBLIGATORIO antes de enviar, en TODOS los modos: ¿podría el estudiante identificar con
  alta certeza la alternativa correcta copiando, comparando o siguiendo lo que escribí? Si sí,
  reescribe: conserva la ayuda pedagógica, elimina la revelación o la derivación.
- COHERENCIA DENTRO DE UNA MISMA RESPUESTA: si declaras que no puedes revelar ni derivar algo, nunca
  entregues después el contenido negado.
- La protección TERMINA cuando el contexto académico indica que el estudiante YA respondió esa
  pregunta: ahí sí identificas la alternativa correcta, explicas los distractores, completas la
  solución y analizas su error.
```

## Cómo queda cada modo ante una pregunta NO respondida

| Modo | SÍ puede | NO puede (bajo la política global) |
|---|---|---|
| `HINT_FIRST` | Señalar concepto, principio, periodo, evidencia o estrategia; pregunta abierta genuina | Descartar/acotar alternativas, parafrasear la correcta, pregunta dirigida hacia ella, acumular pistas hasta volverla evidente |
| `CONCEPTUAL_EXPLANATION` | Enseñar concepto/teoría con ejemplos genéricos | Conectar la teoría con el ítem ("por eso aquí corresponde…"), descartar opciones, parafrasear la correcta como conclusión |
| `GUIDED_STEPS` | Dividir el procedimiento, guiar el razonamiento, verificar comprensión | Completar el paso decisivo, hacer la comparación final contra las alternativas, eliminar opciones hasta dejar una |
| `WORKED_SOLUTION` | Trabajar método y razonamiento; explicar por qué se detiene; ofrecer salidas legítimas | Resolver, derivar el resultado, o aplicar "el método completo a los datos reales del enunciado" |

Cuando el contexto indica que el estudiante **ya respondió**, la restricción **desaparece** en los
cuatro modos: el Tutor identifica la alternativa correcta, explica los distractores, completa la
solución y analiza el error.

## Tamaños medidos (`checkpoint/measure-prompt.ts`, ratio empírico 2,5 car./token)

| Fragmento | V4 (car.) | V5 (car.) | Δ car. | Δ tok. aprox. |
|---|---:|---:|---:|---:|
| Bloque base | 4.859 | **4.113** | **−746** | **−298** |
| `HINT_FIRST` | 580 | 634 | +54 | +22 |
| `CONCEPTUAL_EXPLANATION` | 407 | 439 | +32 | +13 |
| `GUIDED_STEPS` | 428 | 503 | +75 | +30 |
| `WORKED_SOLUTION` | 1.449 | **1.191** | **−258** | **−103** |

Instrucciones completas (base + modo):

| Modo | V4 (car.) | V5 (car.) | Δ | Δ % | Δ tok. aprox. |
|---|---:|---:|---:|---:|---:|
| `HINT_FIRST` | 5.439 | 4.747 | −692 | −12,7 % | −277 |
| `CONCEPTUAL_EXPLANATION` | 5.266 | 4.552 | −714 | −13,6 % | −286 |
| `GUIDED_STEPS` | 5.287 | 4.616 | −671 | −12,7 % | −268 |
| `WORKED_SOLUTION` | 6.308 | 5.304 | −1.004 | −15,9 % | −402 |

Tres bloques de modo **crecen levemente** porque V5 explicita la semántica por modo que el Product
Owner pidió; el bloque base cae mucho más de lo que ellos suben, de modo que el prompt efectivo
baja entre −12,7 % y −15,9 % en todos los modos. Ponderado por la mezcla real de turnos del dataset
(HINT 12, CONCEPTUAL 12, GUIDED 7, WORKED 11), la reducción es **≈ −311 tokens/llamada**; sumando
las dos líneas nuevas del bloque de contexto académico (+28 tok en preguntas protegidas, +68 en
respondidas), el neto es **≈ −290 tokens/llamada**, es decir **~2.570 → ~2.280 tokens de entrada
(−11,3 %)** sobre la media real medida en V4.

## No-overfitting (verificación mecánica)

`checkpoint/no-overfitting-check.mjs` verifica sobre el prompt renderizado
(`checkpoint/prompt-v5-rendered.txt`):

- ningún identificador de caso (`P##`/`M##`/`C##`/`L##`/`H##`/`R##`);
- ninguno de los 39 fragmentos/valores/siglas de los fixtures del dataset (enunciados,
  alternativas, explicaciones, cifras, nombres propios, siglas);
- ninguna regla dirigida a una materia concreta ("en Historia…", "para Ciencias…");
- ningún patrón de secreto en ningún archivo del experimento.

Resultado: **OK** en las cuatro comprobaciones. Nota: V4 **sí** tenía overfitting textual leve —
su regla de brevedad usaba como ejemplo `"el 20% de 150"` y `"precio x 1,15"`, que son exactamente
los valores de los fixtures `M1.NUMEROS.PORCENTAJES.Q1/.Q2`. V5 lo sustituye por un ejemplo que no
aparece en ningún fixture (`"el 7% de 400"`).
