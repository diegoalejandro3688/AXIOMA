# Resource Spec — Conjunto de los números enteros y racionales

**Estado editorial:** DRAFT / en construcción — spec fuente para autoría (CONTENT-4.3A). NO importable todavía: no existe módulo `.ts` en `content/estudio/` para este recurso (ver nota de arquitectura al final de este documento).

## Identificación

| Campo | Valor |
|---|---|
| `subjectKey` | `matematica` |
| `unitCode` | `M1.NUMEROS` |
| `topicCode` | `M1.NUMEROS.ENTEROS_RACIONALES` |
| `resourceKey` | `M1.NUMEROS.ENTEROS_RACIONALES.LECCION` |
| `resourceType` | `LESSON` |
| `order` (dentro de la unidad) | `1` |

## Fuente DEMRE (verbatim, PAES M1, Eje Números — ver sección A/B del reporte de entrega)

> **Conjunto de los números enteros y racionales**
> - Operaciones y orden en el conjunto de los números enteros y racionales.
> - Problemas que involucren el conjunto de los números enteros y racionales en diversos contextos.

## Objetivo de aprendizaje (congelado)

Que el estudiante domine la representación, comparación y operatoria con números enteros y racionales y pueda utilizarlos para resolver problemas matemáticos y contextualizados.

## Cobertura de la mini-lección

1. Conjunto de los números enteros (ℤ): definición y ubicación en la recta numérica.
2. Orden y comparación de enteros; uso de la recta numérica.
3. Suma y resta de enteros.
4. Multiplicación y división de enteros; regla de los signos.
5. Números racionales (ℚ): fracciones y decimales como dos representaciones del mismo conjunto.
6. Equivalencia entre fracciones y decimales.
7. Comparación y orden de racionales.
8. Operatoria con racionales (suma, resta, multiplicación, división).
9. Operatoria combinada (orden de las operaciones) con enteros y racionales.
10. Resolución de problemas contextualizados.

Toda la cobertura anterior es una descomposición pedagógica de los dos bullets oficiales DEMRE citados arriba — ningún punto excede el alcance oficial; son pasos necesarios para que un estudiante domine "operaciones y orden en el conjunto de los números enteros y racionales".

## Mini-lección (borrador de contenido — listo para transcribir a `contentBlocks`)

Estructura: concepto → regla/procedimiento → ejemplo(s) resuelto(s) → errores frecuentes → síntesis. Extensión objetivo: 3–6 min de lectura.

---

**[heading 1] Conjunto de los números enteros y racionales**

**[paragraph]** Los números enteros (ℤ) son los naturales, sus opuestos negativos y el cero: `..., -3, -2, -1, 0, 1, 2, 3, ...`. Se ordenan en la recta numérica: mientras más a la derecha, mayor es el número. Por ejemplo, `-5 < -2` porque `-5` está más a la izquierda.

**[heading 2] Operatoria con enteros**

**[paragraph]** Para sumar/restar enteros de igual signo, se suman sus valores absolutos y se conserva el signo. Para sumar enteros de distinto signo, se restan los valores absolutos y se conserva el signo del de mayor valor absoluto.

**[paragraph]** Regla de los signos para multiplicación y división: signos iguales → resultado positivo; signos distintos → resultado negativo.
**[formula]** `(-4) \times (-3) = 12 \quad ; \quad (-4) \times 3 = -12`

**[heading 2] Números racionales**

**[paragraph]** Un número racional es todo aquel que se puede escribir como fracción `a/b`, con `b ≠ 0`. Los decimales finitos y los decimales periódicos son racionales, porque siempre se pueden expresar como fracción. Por ejemplo, `0,5 = 1/2` y `0,\overline{3} = 1/3`.

**[paragraph]** Para comparar racionales conviene llevarlos a un denominador común o convertirlos a decimal. Ejemplo: ¿es mayor `3/4` o `2/3`? Con denominador común 12: `3/4 = 9/12` y `2/3 = 8/12`, luego `3/4 > 2/3`.

**[heading 2] Operatoria con racionales**

**[paragraph]** Suma/resta de fracciones: se requiere igual denominador (amplificar si es necesario). Multiplicación: numerador por numerador, denominador por denominador. División: se multiplica por el recíproco de la segunda fracción.
**[formula]** `\dfrac{2}{3} + \dfrac{1}{6} = \dfrac{4}{6} + \dfrac{1}{6} = \dfrac{5}{6}`
**[formula]** `\dfrac{2}{3} \div \dfrac{4}{5} = \dfrac{2}{3} \times \dfrac{5}{4} = \dfrac{10}{12} = \dfrac{5}{6}`

**[heading 2] Ejemplo resuelto — operatoria combinada**

**[paragraph]** Calcular `-2 + 3 \times (-1/2)`. Primero la multiplicación: `3 \times (-1/2) = -3/2`. Luego la suma: `-2 + (-3/2) = -4/2 - 3/2 = -7/2`.

**[heading 2] Errores frecuentes**

**[paragraph]** (1) Confundir la regla de los signos al sumar en vez de multiplicar/dividir — sumar sí depende de los valores absolutos, no solo del signo. (2) Comparar fracciones sin igualar denominador o sin convertir a decimal. (3) Olvidar el orden de las operaciones en operatoria combinada (multiplicación/división antes que suma/resta).

**[heading 2] Síntesis**

**[paragraph]** Los enteros y racionales comparten reglas de orden y de signos; los racionales añaden la equivalencia fracción-decimal y la operatoria entre fracciones. Dominar ambos conjuntos permite resolver problemas cotidianos que combinan cantidades positivas, negativas, fraccionarias y decimales.

---

## Matriz futura de las 10 preguntas (CONTENT-4.3C)

| # | Dificultad | Categoría | Foco conceptual sugerido |
|---|---|---|---|
| 1 | FACIL | Fundamentos | Orden/comparación de enteros en la recta numérica |
| 2 | FACIL | Fundamentos | Suma/resta directa de enteros |
| 3 | FACIL | Operatoria | Regla de los signos en multiplicación/división |
| 4 | MEDIA | Operatoria | Equivalencia fracción ↔ decimal |
| 5 | MEDIA | Operatoria | Comparación/orden de racionales |
| 6 | MEDIA | Operatoria | Suma/resta de fracciones con distinto denominador |
| 7 | MEDIA | Interpretación | Multiplicación/división de fracciones |
| 8 | MEDIA | Interpretación | Operatoria combinada (enteros + racionales) |
| 9 | DIFICIL | Problema contextualizado | Problema cotidiano con enteros negativos (ej. temperatura, saldo) |
| 10 | DIFICIL | Integración PAES | Problema contextualizado que combina enteros y racionales, estilo ítem PAES real |

Total: 3 FACIL + 5 MEDIA + 2 DIFICIL = 10. (Nota: fila 7 y 8 quedan clasificadas MEDIA por cobertura temática "Operatoria"/"Interpretación" de la matriz conceptual pedida por el encargo; la distribución de dificultad real y definitiva la fija CONTENT-4.3C al redactar cada ítem.)

## Nota de arquitectura — por qué este documento vive fuera de `content/estudio/`

`resourceContentModuleSchema` (`content/schema.ts`) exige `questions: z.array(sourceQuestionSchema).min(1)` — un módulo de Recurso real no puede existir sin al menos una pregunta válida y completa. CONTENT-4.3A tiene prohibido escribir preguntas (reales o placeholder). Por tanto, este Resource Spec se mantiene como documento (`content/specs/m1-numeros/*.md`), fuera del árbol que `content/load.ts` recorre (`findContentFiles` solo indexa `.ts`), y el manifest se actualiza con la entrada oficial de este recurso sin que exista todavía un módulo `.ts` correspondiente — comportamiento ya tolerado por el gate (`resourcesPresent` es informativo, no bloqueante). Ver sección de riesgos del reporte de entrega para el detalle completo.
