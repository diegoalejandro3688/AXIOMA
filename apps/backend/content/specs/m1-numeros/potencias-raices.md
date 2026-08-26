# Resource Spec — Potencias y raíces enésimas

**Estado editorial:** DRAFT / en construcción — spec fuente para autoría (CONTENT-4.3A). NO importable todavía (ver nota de arquitectura al final).

## Identificación

| Campo | Valor |
|---|---|
| `subjectKey` | `matematica` |
| `unitCode` | `M1.NUMEROS` |
| `topicCode` | `M1.NUMEROS.POTENCIAS_RAICES` |
| `resourceKey` | `M1.NUMEROS.POTENCIAS_RAICES.LECCION` |
| `resourceType` | `LESSON` |
| `order` (dentro de la unidad) | `3` |

## Fuente DEMRE (verbatim, PAES M1, Eje Números)

> **Potencias y raíces enésimas**
> - Propiedades de las potencias de base racional y exponente racional.
> - Descomposición y propiedades de las raíces enésimas en los números reales.
> - Problemas que involucren potencias y raíces enésimas en los números reales en diversos contextos.

## Objetivo de aprendizaje (congelado)

Que el estudiante comprenda y aplique las propiedades de potencias y raíces enésimas, pueda transformar y simplificar expresiones y resolver problemas utilizando estas herramientas.

## Cobertura de la mini-lección

1. Concepto de potencia: base y exponente.
2. Propiedades de potencias: producto de potencias de igual base, cociente de potencias de igual base.
3. Potencia de una potencia.
4. Exponente negativo (definición como recíproco).
5. Base racional (potencias de fracciones).
6. Concepto de raíz enésima.
7. Propiedades de raíces (raíz de un producto, raíz de un cociente).
8. Simplificación de expresiones con raíces.
9. Relación entre potencias y raíces (exponente racional ↔ raíz).
10. Exponentes racionales — DEMRE lo declara explícitamente ("base racional y exponente racional"), incluido en el alcance oficial.
11. Problemas matemáticos y contextualizados.

## Mini-lección (borrador de contenido — listo para transcribir a `contentBlocks`)

---

**[heading 1] Potencias y raíces enésimas**

**[paragraph]** Una potencia `a^n` (base `a`, exponente `n`) representa la multiplicación de `a` por sí mismo `n` veces, cuando `n` es un entero positivo. Por ejemplo, `2^4 = 2 \times 2 \times 2 \times 2 = 16`.

**[heading 2] Propiedades de potencias**

**[paragraph]** Multiplicación de potencias de igual base: se suman los exponentes. División de potencias de igual base: se restan los exponentes. Potencia de una potencia: se multiplican los exponentes.
**[formula]** `a^m \times a^n = a^{m+n} \qquad a^m \div a^n = a^{m-n} \qquad (a^m)^n = a^{m \times n}`

**[heading 2] Exponente negativo**

**[paragraph]** Un exponente negativo indica el recíproco de la potencia con exponente positivo.
**[formula]** `a^{-n} = \dfrac{1}{a^n} \qquad \text{(con } a \neq 0\text{)}`

**[heading 2] Base racional**

**[paragraph]** Las mismas propiedades aplican cuando la base es una fracción.
**[formula]** `\left(\dfrac{2}{3}\right)^{2} = \dfrac{2^2}{3^2} = \dfrac{4}{9}`

**[heading 2] Raíz enésima**

**[paragraph]** La raíz enésima de `a`, escrita `\sqrt[n]{a}`, es el número que elevado a `n` da `a`. Por ejemplo, `\sqrt[3]{8} = 2` porque `2^3 = 8`.
**[formula]** `\sqrt[n]{a} = b \iff b^n = a`

**[heading 2] Propiedades de raíces**

**[paragraph]** La raíz de un producto es el producto de las raíces; la raíz de un cociente es el cociente de las raíces (bajo las condiciones habituales de existencia en los reales).
**[formula]** `\sqrt[n]{a \times b} = \sqrt[n]{a} \times \sqrt[n]{b} \qquad \sqrt[n]{\dfrac{a}{b}} = \dfrac{\sqrt[n]{a}}{\sqrt[n]{b}}`

**[heading 2] Relación entre potencias y raíces — exponente racional**

**[paragraph]** Una raíz enésima se puede escribir como una potencia de exponente racional (fraccionario): el denominador del exponente es el índice de la raíz.
**[formula]** `\sqrt[n]{a^m} = a^{\frac{m}{n}}`

**[heading 2] Ejemplo resuelto — simplificación**

**[paragraph]** Simplificar `\sqrt[3]{54}`. Se descompone `54 = 27 \times 2`, y `27 = 3^3`, así: `\sqrt[3]{54} = \sqrt[3]{27 \times 2} = \sqrt[3]{27} \times \sqrt[3]{2} = 3\sqrt[3]{2}`.

**[heading 2] Errores frecuentes**

**[paragraph]** (1) Sumar exponentes al multiplicar potencias de BASES DISTINTAS (la propiedad solo aplica con igual base). (2) Confundir `a^{-n}` con `-a^n`. (3) Aplicar la propiedad de raíz de una suma como si fuera raíz de un producto — `\sqrt[n]{a+b} \neq \sqrt[n]{a} + \sqrt[n]{b}` en general.

**[heading 2] Síntesis**

**[paragraph]** Las potencias y las raíces enésimas son operaciones inversas relacionadas por el exponente racional. Dominar sus propiedades permite simplificar expresiones y resolver problemas que combinan ambas herramientas.

---

## Matriz futura de las 10 preguntas (CONTENT-4.3C)

| # | Dificultad | Categoría | Foco conceptual sugerido |
|---|---|---|---|
| 1 | FACIL | Fundamentos | Cálculo directo de una potencia de exponente entero positivo |
| 2 | FACIL | Fundamentos | Producto de potencias de igual base |
| 3 | FACIL | Operatoria | Potencia de una potencia |
| 4 | MEDIA | Operatoria | Exponente negativo |
| 5 | MEDIA | Operatoria | Potencia de base racional (fracción) |
| 6 | MEDIA | Operatoria | Cálculo directo de una raíz enésima exacta |
| 7 | MEDIA | Interpretación | Simplificación de una raíz mediante descomposición |
| 8 | MEDIA | Interpretación | Conversión entre raíz y exponente racional |
| 9 | DIFICIL | Problema contextualizado | Problema que combina propiedades de potencias y raíces |
| 10 | DIFICIL | Integración PAES | Problema contextualizado con exponente racional, estilo ítem PAES real |

Total: 3 FACIL + 5 MEDIA + 2 DIFICIL = 10.

## Nota de arquitectura — por qué este documento vive fuera de `content/estudio/`

Idéntica razón que en los otros dos Resource Specs: `resourceContentModuleSchema.questions` exige mínimo 1 pregunta real; CONTENT-4.3A no escribe preguntas. Este documento es la fuente para CONTENT-4.3C, no un módulo importable.
