# INCIDENTE — llamadas reales de `AXIOMA_TUTOR_V4` durante la preparación de V5

> **ESTO NO ES EVIDENCIA DE LA EVALUACIÓN DE V5.**
>
> Este documento registra un **incidente operativo**, no un resultado. Las 32 llamadas
> descritas aquí se emitieron con el prompt **`AXIOMA_TUTOR_V4`**, contra un backend que
> **no era** el que el agente creía estar usando, y **ninguna** de ellas forma parte de
> ninguna matriz de evaluación.
>
> - **NUNCA** se combinen estas cifras con `experiments/tutor-pedagogy-v4-eval/evaluation.md`
>   ni con sus resultados: esa evidencia está congelada, es una corrida distinta y este
>   documento no la modifica ni la corrige.
> - **NUNCA** se combinen con ningún resultado futuro de V5. La evaluación de V5 **no se
>   inició**: a la fecha de este documento hay **cero** filas con `promptVersion = AXIOMA_TUTOR_V5`
>   en el ledger.
> - Vive en el directorio de V5 **únicamente** porque ocurrió durante su preparación.
>   Su relevancia para V5 es presupuestaria y de proceso, no de medición pedagógica.

- **Fecha:** 2026-08-13
- **Estado:** cerrado (contención, corrección de causa raíz y precondición nueva aplicadas)
- **Impacto económico:** US$0,3494 de gasto real no planificado
- **Impacto sobre la evidencia:** ninguno. No contaminó V3, V4 ni V5.

---

## 1. Qué pasó

Durante la preparación del checkpoint de `AXIOMA_TUTOR_V5`, el agente necesitaba un backend
con `AI_PROVIDER_IMPL=fake` para correr gates deterministas sin gasto. Intentó levantar ese
backend fake en el puerto `:3101`.

Ese puerto **ya estaba ocupado** por un proceso **real** preexistente: un backend levantado
con `AI_PROVIDER_IMPL=anthropic` y una API key real, sobrante de la ejecución real de la
evaluación de V4 realizada horas antes ese mismo día.

El proceso fake recién lanzado **no pudo bindear el puerto y murió en silencio**. Como su
salida estaba redirigida a un archivo de log, no quedó rastro visible del fallo en la
consola del agente.

A partir de ahí, todo lo que el agente dirigió a `:3101` creyendo hablar con su backend fake
llegó en realidad al **backend real**, que atendió cada petición emitiendo llamadas pagadas
a Anthropic:

- `verify-ai-safety-gate.ts`
- `verify-ai-pedagogy-gate.ts`
- un script de diagnóstico puntual

Ninguno de ellos comprobaba contra qué proceso estaba hablando. El único criterio implícito
era **"el puerto responde, luego es mi proceso"**.

## 2. Medición exacta (fuente: ledger real, `ai_usage_ledger` en Postgres)

Consulta de verificación (reejecutada durante el cierre del incidente):

```sql
SELECT count(*) AS calls, sum(input_tokens) AS in_tok, sum(output_tokens) AS out_tok,
       min(occurred_at) AS first_at, max(occurred_at) AS last_at
FROM ai_usage_ledger
WHERE prompt_version = 'AXIOMA_TUTOR_V4' AND provider = 'anthropic'
  AND occurred_at >= '2026-08-13 21:00:00' AND occurred_at < '2026-08-13 22:00:00';
```

| Métrica | Valor medido |
|---|---|
| Llamadas reales | **32** |
| Tokens de entrada | **77.576** |
| Tokens de salida | **7.776** |
| Modelo | `claude-sonnet-5` |
| Proveedor | `anthropic` |
| `promptVersion` | **`AXIOMA_TUTOR_V4`** (las 32; ninguna V5) |
| Ventana | 21:15:24.920Z – 21:21:29.781Z |
| Coste | **US$0,3494** |

Coste calculado con la misma tarifa de referencia usada en `cost-plan.json`
(~US$3/MTok entrada, ~US$15/MTok salida): `77.576 × 3/10⁶ + 7.776 × 15/10⁶ = 0,232728 + 0,116640 = 0,349368`.

**Verificación de que V5 no se tocó:** `SELECT count(*) FROM ai_usage_ledger WHERE prompt_version = 'AXIOMA_TUTOR_V5'` → **0**.
La evaluación de V5 nunca se inició por accidente.

## 3. Causa raíz

**Falso positivo de identidad de proceso: "puerto abierto = mi proceso".**

Ni el runner de evaluación ni los gates verificaban *contra qué backend* estaban hablando.
La única confirmación de que una corrida había sido efectivamente fake era **a posteriori**,
leyendo `provider` en el ledger — es decir, **después de haber gastado**. Ese control sirve
para auditar, no para prevenir.

Dos factores agravantes:

1. **Fallo silencioso al bindear.** El proceso fake murió sin señal visible (log redirigido),
   así que la ausencia de error se leyó como éxito.
2. **Puerto por defecto compartido.** Los gates usan `http://127.0.0.1:3000` por defecto y la
   convención de puertos de evaluación (`:3101`) no está reservada ni verificada por nadie.

## 4. Detección y contención (durante el incidente)

El agente detectó la anomalía, dejó de dirigir tráfico a `:3101`, levantó su propio backend
en `:3199`, **verificó `provider = 'fake'` en el ledger antes de continuar** y repitió la
validación limpia (181 filas, 100 % fake). Su backend `:3199` quedó detenido al terminar.

**Cabo suelto que quedó abierto:** el agente **no verificó fehacientemente** si el proceso
preexistente de `:3101` seguía vivo — solo dejó de tocarlo.

## 5. Cierre del cabo suelto (2026-08-13, tarea de cierre)

Verificación del puerto `:3101`:

```powershell
Get-NetTCPConnection -LocalPort 3101   # -> sin resultados
netstat -ano | Select-String ":3101\s" # -> "NADA escuchando en :3101"
```

**Resultado: ningún proceso escucha en `:3101`.** El proceso real del incidente ya no existe;
no hubo nada que detener y no se forzó la terminación de nada.

**Hallazgo colateral:** existe un proceso residual **PID 5368**, `node --enable-source-maps
apps/backend/dist/main`, lanzado desde este repositorio, escuchando en **`:3000`**. Su modo
(`fake` o `anthropic`) **no pudo confirmarse**: corre un build anterior que no incluye el
endpoint de introspección añadido en esta tarea, y sondearlo con una generación real habría
sido precisamente el error que este incidente documenta. **No se terminó**, por la misma
regla que ordena no matar a ciegas lo que no se puede identificar. Requiere verificación
manual del operador. Nótese que `:3000` es el valor **por defecto** de `base` en todos los
gates de AI, así que correr un gate sin pasar `base` explícitamente lo dirigiría a este
proceso no identificado.

## 6. Correcciones aplicadas

### 6.1 Precondición obligatoria de identidad de proceso (prevención)

Regla nueva de diseño: **un puerto abierto NUNCA es evidencia suficiente de la identidad del
proceso que escucha.**

- **Mecanismo (nuevo, mínimo):** `GET /ai/_internal/effective-provider` en
  `apps/backend/src/ai/ai-internal-admin.controller.ts`. Endpoint interno de **solo lectura**,
  protegido por `InternalOpsGuard` y con rechazo explícito en producción — exactamente el
  mismo patrón que el resto de endpoints de diagnóstico de ese controller. Devuelve
  `{ provider, impl, configured }`.

  Punto clave de diseño: `provider` **no** se deriva de leer una variable de entorno, sino de
  la **instancia realmente inyectada** bajo el token `AI_PROVIDER` (`activeProvider instanceof
  FakeAiProvider`). Es la única lectura que no puede mentir si el entorno y la DI divergieran.
  Nunca expone la API key ni ningún otro secreto.

- **Runner de V5** (`runner.mjs`): `assertBackendIdentity()` es ahora el **primer paso
  obligatorio** de toda corrida ejecutable, antes de la primera llamada de la matriz.
  `--fake` exige `provider === 'fake'`; `--live` exige `provider === 'anthropic'`. Si no
  coincide, o si la identidad no puede confirmarse (endpoint ausente, guard rechazando,
  backend caído), **aborta**. La identidad confirmada queda registrada en
  `backendIdentity` dentro de `_summary.json` de la corrida.

- **Gates** `verify-ai-safety-gate.ts` (check `B0`) y `verify-ai-pedagogy-gate.ts` (check `0z`)
  — los dos que el incidente golpeó — confirman `provider = fake` antes de la primera
  generación y abortan ruidosamente si no pueden.

La comprobación a posteriori contra el ledger se conserva sin cambios, pero deja de ser la
primera línea de defensa.

### 6.2 Aislamiento del contador de `FakeAiProvider` (determinismo de `B3s-4`)

Independiente del incidente, pero diagnosticado en el mismo checkpoint: el check `B3s-4` de
`verify-ai-safety-gate.ts` era **intermitente**.

**Causa raíz:** `FakeAiProvider.callCounts` está indexado por el **contenido** del mensaje y
el sentinel `FAKE_AI_PROVIDER_SAFETY_REFUSAL_TRIGGER` es una **constante fija**. El contador
se acumulaba **entre corridas sucesivas contra el mismo proceso de backend** (1ª corrida:
cuenta 1 → PASS; 2ª corrida: cuenta 2 → FALLO), aunque la propiedad realmente bajo prueba
("un rechazo de seguridad nunca se reintenta dentro de UNA operación") se cumplía siempre.

**Corrección:** `FakeAiProvider.resetCallCount(content)` + endpoint
`POST /ai/_internal/reset-fake-provider-call-count`, con las mismas garantías que el resto del
controller. El gate reinicia el contador del sentinel al inicio de su propia corrida (`B3s-0`)
y verifica que la línea base sea exactamente 0 (`B3s-0b`).

**La aserción NO se relajó:** `B3s-4` sigue exigiendo **exactamente 1** invocación física, y
no cambió qué se está probando. Solo se aisló el contador por corrida.
Deliberadamente no se toca `totalCalls` (contador monótono que `verify-ai-status-gate.ts` usa
como delta) ni `failOnceAttempts` (sus gates ya generan contenido único por corrida).

**Evidencia:** tras la corrida 1, el contador del sentinel quedaba en 2 — exactamente la
acumulación que rompía la corrida 2. Con el fix, tres corridas consecutivas contra el **mismo**
proceso de backend (PID 6408, `:3199`) dan PASS: 65 OK / 0 FALLO cada una.

## 7. Presupuesto

El hard cap de US$1,50 para la evaluación de V5 **no se reinicia** por este incidente
(decisión del Product Owner).

| Concepto | Llamadas | Entrada | Salida | Coste |
|---|---:|---:|---:|---:|
| Evaluación real de V4 (05:13–05:18Z) | 34 | 87.393 | 13.905 | US$0,4708 |
| **Incidente** (21:15–21:21Z) | **32** | **77.576** | **7.776** | **US$0,3494** |
| **Acumulado imputable al cap** | **66** | **164.969** | **21.681** | **US$0,8201** |
| Hard cap | | | | US$1,50 |
| **Margen restante** | | | | **US$0,6799** |

Las 22 llamadas de `AXIOMA_TUTOR_V3` presentes en el ledger corresponden a un experimento
anterior y **no** se imputan a este cap.

El margen restante (~US$0,68) sigue por encima de la estimación central de la corrida de V5
(~US$0,56) pero **por debajo** de la cota superior pesimista de `cost-plan.json` (~US$0,85).
El Product Owner debe tener esto presente al autorizar la ejecución real: si la corrida se
comportara como el peor escenario previsto, alcanzaría el cap antes de terminar.

## 8. Atestación

**CERO llamadas reales adicionales a Anthropic se ejecutaron durante el cierre de este
incidente.** Verificado contra el ledger: ninguna fila con `provider <> 'fake'` posterior a
las 21:25Z del 2026-08-13. Todos los gates se corrieron contra un backend con
`AI_PROVIDER_IMPL=fake` cuya identidad fue confirmada explícitamente por el mecanismo descrito
en §6.1.
