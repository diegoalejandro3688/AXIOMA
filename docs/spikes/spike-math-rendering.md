# Spike técnico — Renderizador matemático (Fase 0, Paso 2)

- **Rama**: `spike/math-rendering`
- **Fecha**: 2026-07-30
- **Objetivo**: decidir la arquitectura de renderizado matemático de AXIOMA, no solo elegir una librería.
- **Entregable**: evidencia suficiente para aprobar ADR 0002 con la solución definitiva.
- **Artefactos de este spike**: `spike/math-rendering/` (scripts, casos de prueba, harness de comparación), `apps/mobile/app/lab/math-spike/` (pantallas de prueba en Expo), `apps/mobile/lab-data/math-svg.generated.ts` (datos generados). Nada de esto se integra a la arquitectura hasta aprobar el ADR — vive solo en esta rama.

## Cómo leer este informe

Cada dato está etiquetado:
- **[MEDIDO]** — obtenido ejecutando código real en este entorno (Node.js local, build de Metro, navegador).
- **[INVESTIGADO]** — de documentación oficial o del registro de npm/GitHub, con fuente citada.
- **[NO VERIFICABLE AQUÍ]** — requiere dispositivo Android/iOS real; este sandbox solo tiene el target web de Expo y un navegador Chromium, sin emulador ni dispositivo físico.

## 1. Candidatos evaluados

| Candidato | Mecanismo | Prototipo construido |
|---|---|---|
| **A — SVG pre-renderizado** | LaTeX → SVG una vez en el servidor (MathJax), el cliente solo muestra el SVG (`react-native-svg`) | Sí, funcional, con los 9 casos de prueba |
| **B — KaTeX en vivo (WebView)** | LaTeX se parsea y renderiza en el dispositivo, dentro de un WebView, en cada visualización | Sí — fidelidad probada vía HTML directo; wiring de `react-native-webview` probado y compila |
| **C — Renderizador nativo sin WebView** | Librería RN que dibuja LaTeX directamente con `react-native-svg`, sin WebView ni pre-render | **Descartado sin prototipo** — ver sección 5 |

## 2. Comparativa técnica

| Criterio | A — SVG pre-renderizado | B — KaTeX vía WebView | C — Nativo sin WebView |
|---|---|---|---|
| Facilidad de implementación | Media — requiere pipeline de publicación (LaTeX→SVG) | Alta — HTML+CSS+JS estándar dentro de WebView | Baja — librerías candidatas obsoletas, requeriría fork/mantenimiento propio |
| Rendimiento render inicial | **[MEDIDO]** ~4.3 ms / 50 fórmulas | **[MEDIDO]** ~25 ms / 50 fórmulas (motor completo de parseo+layout) | [NO VERIFICABLE AQUÍ] |
| Rendimiento en scroll (contenido ya montado) | **[MEDIDO]** ~16.6 ms/paso — igual que B | **[MEDIDO]** ~16.8 ms/paso — igual que A | [NO VERIFICABLE AQUÍ] |
| Consumo de memoria | Bajo — SVG es solo geometría vectorial en el árbol de vistas existente | **[INVESTIGADO]** 150–200 MB **por instancia** de WebView ([fuente](https://sph.sh/en/posts/mobile-micro-frontends-react-native-expo-webviews/)) | [NO VERIFICABLE AQUÍ] |
| Impacto en bundle JS (Metro) | **[MEDIDO]** +243.9 KB (librería `react-native-svg` + datos embebidos de prueba) | **[MEDIDO]** +21.0 KB (el wrapper es liviano; KaTeX corre *dentro* del WebView, no pasa por Metro) | [NO VERIFICABLE AQUÍ] |
| Tamaño de assets offline necesarios | ~6.4 KB por fórmula (SVG), se sirven bajo demanda, no se empaquetan todos de antemano | ~592 KB una sola vez (KaTeX JS 268 KB + CSS 28 KB + fuentes woff2 296 KB), **[MEDIDO]**, para que el WebView funcione sin red | [NO VERIFICABLE AQUÍ] |
| Mantenimiento y actividad | MathJax: **[INVESTIGADO]** `mathjax-full` última publicación 2025-10-17 (npm); proyecto histórico, estable | **[INVESTIGADO]** KaTeX 20.3k★, 358 issues abiertos / 40 PRs abiertos, publicado 2026-07-19 (npm) — muy activo. `react-native-webview` 7.2k★, 19 issues abiertos, publicado 2026-07-11 | **[INVESTIGADO]** `react-native-math-view` sin publicar desde 2022-05-14 (4+ años); `react-native-mathjax-html-to-svg` sin publicar desde 2023-06-30 — **ambos efectivamente abandonados** |
| Compatibilidad con Expo (managed) | Alta — `react-native-svg` es un módulo Expo de primera clase, **[MEDIDO]** funciona en SDK 57 | Alta en nativo; **[INVESTIGADO]** `react-native-webview` **no soporta oficialmente el target web** de Expo/RN Web | Depende de `react-native-svg` (mismo módulo que A) pero librerías candidatas no confirman compatibilidad con Nueva Arquitectura |
| Funcionamiento 100% offline | Sí, trivialmente — el SVG es texto estático | Sí, **si** se empaquetan los assets de KaTeX localmente (no probado aquí — el prototipo usa CDN a propósito, ver limitaciones) | Sí, en teoría (mismo principio que A) |
| Accesibilidad | **[MEDIDO]** el SVG no trae texto alternativo ni MathML — hay que generarlo manualmente en publicación | **[MEDIDO]** KaTeX genera `<math>` MathML en paralelo al HTML visual, compatible con lectores de pantalla que soportan MathML | [NO VERIFICABLE AQUÍ] |
| Modo oscuro | **[MEDIDO]** el SVG de MathJax usa `stroke/fill="currentColor"` — hereda el color de texto del contenedor sin ningún ajuste adicional | **[MEDIDO]** CSS estándar, mismo comportamiento | [NO VERIFICABLE AQUÍ] |
| Fórmulas inline y de bloque | **[MEDIDO]** ambos modos funcionan; el SVG escala con el contenedor via unidades `ex` (ver hallazgo §4) | **[MEDIDO]** ambos modos funcionan de forma nativa en KaTeX | [NO VERIFICABLE AQUÍ] |
| Composición con texto RN nativo (fórmulas inline mezcladas en una oración) | **Alta** — un SVG se comporta como una vista más, se intercala con `<Text>` sin fricción | **Baja** — un WebView es un "agujero" rectangular en el árbol nativo; no se puede intercalar fluidamente dentro de una oración de `<Text>` sin trucos de medición de altura vía `postMessage` | [NO VERIFICABLE AQUÍ] |

## 3. Casos de prueba

Los 9 casos (fracción, raíz, exponente, sumatoria, integral, límite, matriz, ecuación cuadrática, fórmula inline mezclada con texto estilo pregunta PAES) están en `spike/math-rendering/test-cases.mjs`, y se generaron y renderizaron correctamente en **ambos** candidatos, sin errores — ver `spike/math-rendering/out/svg/*.svg` (candidato A) y el harness (candidato B). No hubo ningún caso que un candidato resolviera y el otro no: en fidelidad de renderizado, **A y B son equivalentes** para el repertorio de LaTeX que necesita AXIOMA.

## 4. Pruebas de rendimiento — resultados medidos

Harness servido localmente (`spike/math-rendering/harness/`, sin CDN, katex y fuentes vendorizadas), abierto en el navegador del entorno.

**Render inicial (promedio de 3 corridas, ms):**

| N fórmulas | Candidato A (SVG) | Candidato B (KaTeX en vivo) |
|---|---|---|
| 1 | 0.2 | 0.4 |
| 10 | 0.9 | 4.0 |
| 50 | 4.6 | 25.3 |

A escala de 50 fórmulas (una práctica o ensayo típico), el SVG pre-renderizado es **~5.5× más rápido** en render inicial. La brecha crece con N, no es constante — importa más cuanto más contenido matemático tenga una pantalla.

**Scroll de contenido ya renderizado (200 ítems):** ~16.6–16.8 ms/paso para **ambos** candidatos — sin diferencia significativa. Hallazgo esperado: el costo de scroll lo domina la mecánica del navegador/compositor sobre contenido ya montado, no cómo se generó ese contenido. La ventaja de A está en el *montaje inicial*, no en el scroll posterior.

**Hallazgo corregido durante el spike:** la hipótesis inicial (documentada en ADR 0001) era que el SVG pre-renderizado tendría "dimensiones fijas" que no siguen el escalado de fuente del usuario. Esto era **incorrecto** — se verificó empíricamente que MathJax exporta ancho/alto en unidades CSS `ex` (relativas al `font-size` del contenedor), por lo que el SVG escala automáticamente igual que el texto: a escala de fuente 200%, el ancho medido fue 117.08px (SVG) vs 117.5px (KaTeX vivo) — prácticamente idéntico. Este es exactamente el tipo de corrección que este spike existe para producir antes de comprometerse a una arquitectura.

**Modo oscuro:** verificado programáticamente — ambos candidatos heredan `rgb(240,240,240)` (color de texto en modo oscuro) automáticamente vía `currentColor` (SVG) y CSS estándar (KaTeX), sin necesidad de re-colorear cada fórmula manualmente.

## 5. Por qué no se prototipó el Candidato C

`react-native-math-view` (única librería activa en algún momento que renderiza LaTeX a SVG nativo sin WebView) no ha publicado una versión desde **2022-05-14** — más de 4 años. Su dependencia declarada de `react-native-svg@^9` es incompatible con la versión actual (`15.15.5`, la que ya aprobamos en el ADR 0001), y no hay ninguna señal de soporte para la Nueva Arquitectura de React Native. `react-native-mathjax-html-to-svg` tampoco se actualiza desde 2023-06-30. Invertir tiempo de prototipo en dependencias efectivamente abandonadas no se justificaba — el riesgo de mantenimiento ya las descalifica frente a A y B, que están activamente mantenidas. Se documenta la investigación por transparencia, no se recomienda revisitarlas salvo que aparezca una alternativa nueva y activa.

## 6. Evaluación de accesibilidad

| | Candidato A (SVG) | Candidato B (KaTeX) |
|---|---|---|
| Lectores de pantalla | **[MEDIDO]** Sin MathML/alt text por defecto — requiere generar una descripción textual en el momento de publicación y añadirla como `aria-label`/`accessibilityLabel` | **[MEDIDO]** Genera `<math>` MathML en paralelo al HTML visual automáticamente — mejor soporte out-of-the-box para lectores que entienden MathML |
| Texto alternativo | Manual, por fórmula, en el pipeline editorial | Automático (MathML), aunque su calidad de lectura varía según el lector de pantalla |
| Escalado de fuente | **[MEDIDO, corregido]** Sigue el `font-size` del contenedor vía unidades `ex` | **[MEDIDO]** Sigue el `font-size` vía CSS `em` estándar |
| Offline | Trivial — texto estático | Depende de empaquetar assets localmente (no CDN) |

Ninguno gana en todo: B tiene mejor accesibilidad "gratis", A requiere una descripción textual generada en publicación — pero esa descripción de todas formas conviene tenerla (sirve también para búsqueda de contenido y para el tutor IA, que necesita "leer" las fórmulas en texto). Se considera un costo aceptable, no un bloqueante.

## 7. Arquitectura editorial end-to-end (recomendada)

```
Editor de contenido (herramienta interna, Fase 1)
        │  autor escribe LaTeX inline: $...$ (inline) / $$...$$ (bloque)
        ▼
LaTeX fuente (texto plano, guardado como parte de question_version / resource_version)
        │
        ▼
Validación (al guardar / publicar)
   • MathJax intenta convertir cada fórmula server-side; si falla, se rechaza con el error exacto
   • Se genera una descripción textual auxiliar (a11y + búsqueda + contexto para el tutor IA)
   • Se verifica que el LaTeX no use comandos fuera de un whitelist de paquetes soportados
        │  (si pasa)
        ▼
Almacenamiento (Postgres, vía Prisma)
   • Se guardan AMBOS: el LaTeX fuente (nunca se descarta) y el SVG generado (cacheado)
   • Nunca se regenera el SVG en cada lectura -- se genera una vez, se versiona junto al contenido
   • Editar el LaTeX de una pregunta ya publicada crea una nueva versión (mismo patrón que el
     resto del Data Model: question -> question_version)
        │
        ▼
API (NestJS, dominio EDUCATION)
   • El SVG (string, ~6 KB promedio) viaja inline dentro del payload de la pregunta/recurso --
     no una URL aparte a un bucket, salvo que una fórmula resulte excepcionalmente grande
   • El cliente NUNCA recibe LaTeX crudo para renderizar -- solo para accesibilidad/búsqueda
        │
        ▼
Cliente (Expo / React Native)
   • El payload de la pregunta ya incluye el SVG -- se cachea junto con el resto de la
     pregunta en la cola offline existente (sin mecanismo aparte)
        │
        ▼
Renderizador (react-native-svg, SvgXml)
   • Mismo componente en Android, iOS y Web -- sin bifurcación de plataforma
   • Color de texto vía prop `color` (sigue tema claro/oscuro automáticamente)
        │
        ▼
Pantalla
   • Fórmulas de bloque: centradas, tamaño fijo relativo al contenedor
   • Fórmulas inline: el SVG se intercala directamente en el flujo de texto (posible porque
     un SVG es una vista normal, a diferencia de un WebView)
   • Fallback si el SVG no carga: texto plano del LaTeX fuente en monoespaciado + aviso de
     "fórmula no disponible" (reutiliza el estado "error" ya exigido por el Master Context)
```

Este flujo asume la recomendación de la sección 8 (Candidato A). Si en el futuro se sustituyera el motor de renderizado, solo cambia el paso "Validación → Almacenamiento" (se regenera el SVG a partir del LaTeX fuente ya guardado) — el resto del pipeline no se toca, precisamente porque LaTeX (no el SVG) es la fuente de verdad.

## 8. Conclusión y recomendación

**Recomendación: Candidato A — SVG pre-renderizado en servidor (MathJax), mostrado con `react-native-svg`.**

**A favor de A:**
- ~5.5× más rápido en render inicial a la escala real de un ensayo (50 fórmulas) — medido, no estimado.
- Composición nativa con texto: las preguntas PAES mezclan fórmulas inline dentro de oraciones (nuestro propio caso de prueba `inline-mixto` lo confirma) — un SVG se intercala en un `<Text>` sin fricción, un WebView no.
- Cero parsing de LaTeX en el dispositivo — elimina una clase entera de bugs de renderizado inconsistente entre Android/iOS.
- Costo de memoria mínimo, sin el riesgo de 150-200 MB por instancia que trae WebView si una pantalla llega a necesitar varias fórmulas simultáneas visibles.
- El "costo" de accesibilidad (generar descripción textual manualmente) se paga una vez en publicación y además es útil para búsqueda y para el tutor IA — no es un costo puramente perdido.
- Mismo componente (`SvgXml`) funciona igual en Android, iOS y Web — sin bifurcación de plataforma, algo que WebView no puede ofrecer (no soporta Expo Web oficialmente).

**En contra de A / riesgos:**
- Requiere construir el pipeline de publicación (validación + generación de SVG) antes de poder cargar la primera pregunta real — trabajo adicional de Fase 0/1 que con B no existiría (B renderiza LaTeX crudo directamente).
- Mayor costo fijo de bundle JS (+244 KB por `react-native-svg`) vs B (+21 KB) — aunque `react-native-svg` ya es una dependencia aprobada en el ADR 0001 para otros usos (iconografía, gráficos de progreso), así que este costo ya estaba —en gran parte— contabilizado.
- Descripciones de accesibilidad manuales dependen de disciplina editorial — si el equipo no las genera consistentemente, la accesibilidad real será peor que la de B "gratis".

**Riesgo que NO recae sobre A ni B, sino sobre el equipo:** ninguno de los dos candidatos fue probado en un dispositivo Android/iOS real dentro de este spike (sandbox sin emulador). Antes de cerrar el ADR de forma definitiva, recomiendo una validación mínima en al menos un dispositivo Android de gama baja real (o emulador) — específicamente el conteo de fuentes/glifos con `fontCache: 'none'` en MathJax, que aquí se probó en Node/navegador pero no en el motor Hermes+Skia real de React Native.

**Decisión propuesta para ADR 0002**: adoptar el Candidato A como solución oficial. Mantener el Candidato B (KaTeX vía WebView) documentado como alternativa de respaldo si en producción aparecieran fórmulas que MathJax no pueda convertir correctamente (ej. notación muy poco común) — en ese caso puntual, se podría mostrar esa fórmula específica vía WebView como excepción, sin cambiar la arquitectura general.
