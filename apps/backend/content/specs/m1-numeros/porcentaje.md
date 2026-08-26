# Resource Spec — Porcentaje

**Estado editorial:** DRAFT / en construcción — spec fuente para autoría (CONTENT-4.3A). NO importable todavía (ver nota de arquitectura al final).

## Identificación

| Campo | Valor |
|---|---|
| `subjectKey` | `matematica` |
| `unitCode` | `M1.NUMEROS` |
| `topicCode` | `M1.NUMEROS.PORCENTAJE` |
| `resourceKey` | `M1.NUMEROS.PORCENTAJE.LECCION` |
| `resourceType` | `LESSON` |
| `order` (dentro de la unidad) | `2` |

**Nota de auditoría (código, no confundir con contenido preexistente):** `prisma/seed.ts` ya crea, en producción/dev, un `CurriculumTopic` raíz `M1.NUMEROS.PORCENTAJES` (**plural**, título "Porcentajes y proporcionalidad") con contenido de prueba (`TEST-CONTENT-1`, no es catálogo PAES real) y preguntas `M1.NUMEROS.PORCENTAJES.Q1..Q12`. El código de este Resource Spec, `M1.NUMEROS.PORCENTAJE` (**singular**), es textualmente distinto — sin colisión de fila — pero académicamente se solapa. Ver sección de riesgos del reporte de entrega: esto no se resuelve en CONTENT-4.3A (seed.ts está fuera de alcance) y debe decidirse antes de importar en 4.3B/C.

## Fuente DEMRE (verbatim, PAES M1, Eje Números)

> **Porcentaje**
> - Concepto y cálculo de porcentaje.
> - Problemas que involucren porcentaje en diversos contextos.

## Objetivo de aprendizaje (congelado)

Que el estudiante comprenda el porcentaje como una forma de expresar una proporción y pueda calcular, interpretar y resolver porcentajes y variaciones porcentuales en contextos matemáticos y cotidianos.

## Cobertura de la mini-lección

1. Concepto de porcentaje como proporción respecto de 100.
2. Relación porcentaje ↔ fracción ↔ decimal.
3. Cálculo del porcentaje de una cantidad.
4. Determinar qué porcentaje representa una cantidad respecto de otra.
5. Determinar el total conociendo una parte porcentual (cálculo inverso).
6. Aumento porcentual.
7. Disminución porcentual.
8. Variación porcentual (general).
9. Variaciones sucesivas (dos cambios porcentuales aplicados en secuencia).
10. Identificación correcta de la cantidad base / 100%.
11. Problemas contextualizados (descuentos, IVA, intereses simples de contexto cotidiano).

Toda la cobertura es una descomposición del bullet oficial "concepto y cálculo de porcentaje" + "problemas que involucren porcentaje en diversos contextos" — DEMRE no detalla sub-bullets, pero variaciones/aumentos/disminuciones son la forma estándar en que "problemas de porcentaje en diversos contextos" se manifiesta en ítems PAES reales.

## Mini-lección (borrador de contenido — listo para transcribir a `contentBlocks`)

---

**[heading 1] Porcentaje**

**[paragraph]** Un porcentaje expresa una cantidad como parte de 100. El símbolo `%` significa "de cada 100". Así, `35% = 35/100 = 0,35`.
**[formula]** `p\% = \dfrac{p}{100}`

**[heading 2] Porcentaje de una cantidad**

**[paragraph]** Para calcular el `p%` de una cantidad `C`, se multiplica `C` por `p/100`.
**[formula]** `20\% \text{ de } 150 = 150 \times \dfrac{20}{100} = 30`

**[heading 2] Qué porcentaje representa una cantidad de otra**

**[paragraph]** Para saber qué porcentaje es `a` respecto de `b`, se calcula `(a/b) × 100`.
**[formula]** `\dfrac{30}{150} \times 100 = 20\%`

**[heading 2] Cálculo inverso: encontrar el total**

**[paragraph]** Si se conoce que una parte `a` corresponde a un `p%` del total, el total se obtiene despejando: `\text{total} = a \div (p/100)`.
**[formula]** `\text{Si } 30 \text{ es el } 20\% \text{ de un número, ese número es } 30 \div 0,20 = 150`

**[heading 2] Aumentos y disminuciones porcentuales**

**[paragraph]** Aumentar una cantidad en `p%` equivale a multiplicarla por `(1 + p/100)`. Disminuirla en `p%` equivale a multiplicarla por `(1 - p/100)`.
**[formula]** `\text{Aumento del } 10\%: \quad C \times 1,10 \qquad \text{Descuento del } 15\%: \quad C \times 0,85`

**[heading 2] Ejemplo resuelto — variaciones sucesivas**

**[paragraph]** Un producto de $10.000 sube 20% y luego baja 10%. Precio tras el alza: `10.000 × 1,20 = 12.000`. Precio tras la baja: `12.000 × 0,90 = 10.800`. El resultado NO es un cambio neto de 10% (20% − 10%): las variaciones sucesivas se componen multiplicativamente, no se suman ni se restan directamente.

**[heading 2] Errores frecuentes**

**[paragraph]** (1) Sumar/restar porcentajes de variaciones sucesivas en vez de componerlas multiplicativamente. (2) Confundir la base del porcentaje (calcular el `p%` de la cantidad equivocada, por ejemplo del precio final en vez del precio original). (3) Olvidar convertir el porcentaje a su forma decimal/fraccionaria antes de operar.

**[heading 2] Síntesis**

**[paragraph]** El porcentaje es una proporción sobre 100. Identificar correctamente cuál es la cantidad base (el 100%) es la clave para resolver cualquier problema de porcentaje, incluyendo cálculo directo, cálculo inverso y variaciones porcentuales simples o sucesivas.

---

## Matriz futura de las 10 preguntas (CONTENT-4.3C)

| # | Dificultad | Categoría | Foco conceptual sugerido |
|---|---|---|---|
| 1 | FACIL | Fundamentos | Conversión porcentaje ↔ fracción ↔ decimal |
| 2 | FACIL | Fundamentos | Cálculo directo del `p%` de una cantidad |
| 3 | FACIL | Operatoria | Qué porcentaje representa una cantidad de otra |
| 4 | MEDIA | Operatoria | Cálculo inverso (determinar el total) |
| 5 | MEDIA | Operatoria | Aumento porcentual simple |
| 6 | MEDIA | Operatoria | Disminución porcentual simple |
| 7 | MEDIA | Interpretación | Identificación de la base/100% en un enunciado ambiguo |
| 8 | MEDIA | Interpretación | Variación porcentual general (comparar dos estados) |
| 9 | DIFICIL | Problema contextualizado | Variaciones porcentuales sucesivas |
| 10 | DIFICIL | Integración PAES | Problema cotidiano compuesto (descuento + impuesto, o similar), estilo ítem PAES real |

Total: 3 FACIL + 5 MEDIA + 2 DIFICIL = 10.

## Nota de arquitectura — por qué este documento vive fuera de `content/estudio/`

Idéntica razón que en el Resource Spec de Enteros y racionales: `resourceContentModuleSchema.questions` exige mínimo 1 pregunta real; CONTENT-4.3A no escribe preguntas. Este documento es la fuente para CONTENT-4.3C, no un módulo importable.
