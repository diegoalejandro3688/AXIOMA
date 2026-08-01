# ADR 0002 — Renderizador matemático de AXIOMA

- **Estado**: **Aprobada formalmente** — comprobaciones finales de escalado, scroll y modo oscuro completadas por el usuario en dispositivo Android físico, resultado satisfactorio (2026-07-31).
- **Fecha**: 2026-07-31
- **Fase de aplicación**: Fase 0 — Foundation (cierra el Paso 2, spike del renderizador matemático)
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — transversal, difícil de revertir
- **Documento fuente**: `docs/spikes/spike-math-rendering.md` (spike completo, rama `spike/math-rendering`)

## Contexto

ADR 0001 dejó el renderizador matemático explícitamente abierto, sujeto a un spike técnico
(criterios: accesibilidad, texto alternativo, escalado de fuente, modo oscuro, fórmulas
inline y de bloque, sintaxis avanzada, nitidez, rendimiento en listas). El spike se
ejecutó en la rama `spike/math-rendering`: comparó tres candidatos con evidencia medida
(no estimada) — SVG pre-renderizado (MathJax, servidor), KaTeX vía WebView, y
renderizador nativo sin WebView (descartado sin prototipo por dependencias abandonadas).

## Decisión

Se adopta el **Candidato A — SVG pre-renderizado con MathJax + `react-native-svg`**
como la arquitectura oficial de renderizado matemático de AXIOMA.

- El **LaTeX es la fuente de verdad**, almacenado junto al contenido (`question_version`,
  `resource_version`). Nunca se descarta tras generar el SVG.
- El SVG se genera **una sola vez, en el momento de publicación** (servidor, MathJax,
  `fontCache: 'none'` para que cada SVG sea autocontenido), no en cada lectura ni en el
  dispositivo del estudiante.
- El SVG viaja **inline** dentro del payload de la pregunta/recurso (no una URL aparte a
  un bucket, dado su tamaño promedio de ~6.4 KB), lo que le permite cachearse junto con
  el resto de la pregunta cuando exista un mecanismo de descarga de contenido para uso
  offline.
  **Corrección (Architecture Review 1.0, 2026-08-01)**: esta frase decía originalmente
  "se cachea junto con el resto de la pregunta en la cola offline ya existente" — en
  el momento de este ADR (Fase 0, Paso 2) no existía ningún mecanismo offline todavía.
  La fundación de persistencia offline construida después (ADR-0011) es una cola de
  **intenciones salientes** (respuestas del estudiante pendientes de enviar), no una
  caché de **contenido entrante** para lectura sin conexión — son mecanismos distintos.
  La descarga/caché de contenido (incluyendo el SVG inline de este ADR) sigue sin
  construirse; es Master Context 8.8 ("recursos descargados"), explícitamente fuera de
  alcance de Fase 0 (ver ADR-0011, "Fuera de alcance").
- El cliente renderiza con `SvgXml` de `react-native-svg` — mismo componente en Android,
  iOS y Web, sin bifurcación de plataforma.
- Cada fórmula debe llevar una descripción textual generada en publicación (accesibilidad
  + búsqueda + contexto para el tutor IA) — ver arquitectura editorial en el spike, sección 7.
- KaTeX vía WebView queda documentado como **alternativa de respaldo puntual**, solo para
  el caso excepcional de una fórmula que MathJax no pueda convertir — no cambia la
  arquitectura general si eso ocurre.

## Evidencia que sostiene la decisión

Del spike (`docs/spikes/spike-math-rendering.md`), todo etiquetado como medido, no estimado:

- **Rendimiento**: con 50 fórmulas, SVG pre-renderizado ~5.5× más rápido en render
  inicial que KaTeX en vivo (4.6 ms vs 25.3 ms, promedio de 3 corridas).
- **Memoria**: WebView cuesta 150–200 MB por instancia (fuente citada) — inviable para
  pantallas con varias fórmulas simultáneas; SVG no tiene ese costo, es geometría
  vectorial normal en el árbol de vistas.
- **Composición con texto**: un SVG se intercala en un `<Text>` nativo sin fricción; un
  WebView no puede mezclarse fluidamente dentro de una oración — decisivo para las
  preguntas PAES que mezclan fórmulas inline con texto (caso de prueba `inline-mixto`).
- **Escalado de fuente**: verificado empíricamente que el SVG de MathJax exporta en
  unidades `ex` (relativas al `font-size` del contenedor), así que escala igual que
  KaTeX — se corrigió un supuesto inicial equivocado del ADR 0001 gracias a esta prueba.
- **Modo oscuro**: el SVG usa `stroke/fill="currentColor"`, hereda el color del texto
  del contenedor automáticamente, sin re-colorear cada fórmula.
- **Mantenimiento**: MathJax y `react-native-svg` activamente mantenidos (última
  publicación 2025-10-17 y 2026-05-20 respectivamente); las librerías nativas sin
  WebView candidatas al Candidato C llevan 3-4 años sin publicar versión — descartadas.
- **Compatibilidad Expo**: `react-native-svg` es módulo Expo de primera clase, confirmado
  funcionando en el proyecto real (`apps/mobile`); `react-native-webview` no soporta
  oficialmente el target Web de Expo.

## Validación en dispositivo físico (2026-07-31)

Pantalla representativa (enunciado + fórmula inline + 4 alternativas + explicación con
fórmula de bloque), accesible desde la pantalla base de la app durante el spike, validada
por el usuario en un dispositivo Android físico vía Expo Go. La pantalla vivió en
`apps/mobile/app/lab/math-spike/paes-question.tsx` — eliminada del código de producto
al cerrar este ADR (ver "Consecuencias"); el código sigue disponible en el historial de
la rama `spike/math-rendering` y como referencia en `spike/math-rendering/` si hace
falta reconstruirla.

Resultado, confirmado en dos rondas de prueba (2026-07-30 y 2026-07-31):

- Renderizado nítido, sin pixelado.
- Integración fluida de la fórmula inline dentro del texto del enunciado.
- Explicación con fórmula de bloque se visualiza correctamente.
- Experiencia general fluida, sin saltos ni demoras perceptibles.
- Escalado de fuente, scroll y modo oscuro: comprobaciones finales completadas por el
  usuario, resultado satisfactorio. **ADR cerrado de forma definitiva.**

## Alternativas descartadas

- **KaTeX vía WebView** — fidelidad de renderizado equivalente, pero descartado como
  solución primaria por costo de memoria por instancia, imposibilidad de intercalarse
  con texto nativo, y necesidad de empaquetar ~592 KB de assets (KaTeX JS+CSS+fuentes)
  para funcionar offline sin CDN. Se mantiene como respaldo puntual (ver Decisión).
- **Renderizador nativo sin WebView** (`react-native-math-view`,
  `react-native-mathjax-html-to-svg`) — descartado sin prototipo: ambas librerías
  candidatas llevan 3-4 años sin publicar versión, riesgo de mantenimiento ya
  descalificante antes de evaluar cualquier otro criterio.

## Consecuencias

- La Fase 1 (Vertical Slice M1) debe incluir el pipeline de publicación (validación +
  generación de SVG) como parte de la herramienta interna de contenido, no como trabajo
  aparte — ver arquitectura editorial end-to-end en el spike, sección 7.
- Toda pregunta/recurso con fórmulas debe llevar, desde el diseño de sus entidades en
  Prisma, tanto el campo de LaTeX fuente como el SVG generado, versionados juntos.
- Las pantallas de laboratorio (`apps/mobile/app/lab/math-spike/`) y los datos generados
  (`apps/mobile/lab-data/math-svg.generated.ts`) se eliminan de `apps/mobile` al
  fusionar a la rama principal — no son código de producto, solo existieron para
  validar esta decisión. El contenido investigativo (`spike/math-rendering/`) se
  conserva en el repositorio como referencia histórica, fuera de `apps/` y `packages/`.
- Próxima vez que se reevalúe el motor de renderizado (si alguna vez fuera necesario),
  solo cambia el paso de generación de SVG — el LaTeX fuente ya almacenado permite
  regenerar sin perder nada, precisamente porque LaTeX (no el SVG) es la fuente de verdad.

## Validación técnica

- `npx expo-doctor` → 18/18 checks.
- `pnpm -r run typecheck`, `pnpm -r run lint` → sin errores en los 4 paquetes.
- Build de `contracts` y `backend` → sin errores; `GET /health` → `200 OK`.
- `expo export --platform android` → sin errores.
- Bundle Android real servido por Metro (6.75 MB) sin `UnableToResolveError`.
- Validación visual e interactiva en dispositivo Android físico vía Expo Go (ver sección
  "Validación en dispositivo físico").
