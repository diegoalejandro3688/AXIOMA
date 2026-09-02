# TUTOR IA V1 — CLOSURE REPORT

## Estado

**APPROVED / CLOSED** — superficie móvil del Tutor IA (revisión visual + UX).

---

## A. Environment

| | |
|---|---|
| Repo | `C:\Users\usuario 4\Downloads\AXIOMA\app` |
| Branch | `ui-implementation-post-ui6` |
| HEAD al cierre | `fa9b0ef992d4c92fcf69f9ffe5840f944595e2e2` `fix(tutor): improve keyboard and response feedback` |
| Parent de HEAD | `723c899a854a148ecd8f501eda9c86ea30eb6da1` `docs(study): close ensayos and study v1` |
| Base de dominio | LEF Bloque VI (`lef-block-6-tutor-ia-complete`) — fundación funcional del Tutor ya cerrada. Este arco es **refinamiento visual/UX de la superficie móvil**, no del dominio. |

Cierre **solo documentación** — no altera producto. No push · No Railway · No emulator.

---

## B. Scope final

Superficie móvil del Tutor IA:

| Pieza | Archivo | Estado |
|---|---|---|
| Pantalla principal (hub) | `app/(tabs)/ia/index.tsx` | refinada |
| Composer (hub + conversación) | inline en ambos + `AiModeSelector` | refinado |
| Teclado / layout | `KeyboardAvoidingView` en ambos | corregido |
| Conversación (chat) | `app/(tabs)/ia/conversation/[conversationId].tsx` | refinada |
| Feedback de "pensando" | `components/ai/ai-thinking-indicator.tsx` (nuevo) | añadido |
| Autoscroll | `ScrollView` de la conversación | mínimo añadido |

---

## C. Final UX polish

Commit: `fa9b0ef992d4c92fcf69f9ffe5840f944595e2e2` `fix(tutor): improve keyboard and response feedback` (3 archivos: hub, chat, `ai-thinking-indicator.tsx` nuevo — 137 insertions(+), 20 deletions(−)).

### Historial del arco visual del Tutor IA (git — verificado)
| Increment | Hash | Mensaje |
|---|---|---|
| Home overhaul (AI-1 → AI-1J) | `64465ff` | `feat(mobile): close Tutor IA Home visual overhaul (AI-1 -> AI-1J)` |
| Conversación overhaul (AI-2A → AI-2C) | `2cbb540` | `feat(mobile): close Tutor IA conversation visual overhaul (AI-2A -> AI-2C)` |
| **Final UX polish** | `fa9b0ef` | `fix(tutor): improve keyboard and response feedback` |

---

## D. Three final fixes

### 1. Home sin scroll espurio
Recuperación de ~81 px de alto vertical **solo vía spacing/padding** (sin `overflow:hidden`, sin recortar contenido, sin cambiar jerarquía):

| Estilo | before → after |
|---|---|
| `content.gap` | `space5` → `space4` |
| `content.padding` | `space5` → `space4` |
| `content.paddingBottom` | `space8` → `space5` |
| `hero.paddingVertical` | `space5` → `space3` |
| `footerInfo.marginTop` | `space4` → `space3` |
| `<AiTutorMark size>` | `104` → `88` (la caja es `size*2.3`, en su mayor parte aire transparente) |

`flexGrow: 1` + `justifyContent: 'center'` **se mantienen** (look de landing). El `<ScrollView>` **se mantiene** como red de seguridad responsive — en un dispositivo bajo el contenido sigue siendo desplazable, nunca recortado.

### 2. Teclado / composer visible
`KeyboardAvoidingView`: `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` → `behavior={Platform.OS === 'ios' ? 'padding' : 'height'}` (ambas pantallas). El `undefined` en Android dependía de `adjustResize`, que edge-to-edge (default SDK 54) no aplica de forma fiable → el teclado tapaba el composer. `behavior="height"` es el enfoque documentado de RN, **sin dependencia nueva**. **`app.json` NO se modificó** (residue protegido; la instrucción era DETENERSE si hacía falta tocarlo — no hizo falta). Sin positioning absoluto/frágil nuevo — el composer sigue dentro del flujo normal del layout.

### 3. Thinking feedback + autoscroll
- **`AiThinkingIndicator`** (nuevo, módulo-local): misma identidad discreta que una respuesta del Tutor (`AiTutorMark size 18` + "Tutor IA", igual que `ai-message-bubble.tsx`) + 3 puntos de 7 px animados (`opacity` + `scale` ligera, bucle desfasado). Sin spinner grande, sin texto gigante, sin skeleton, sin card nueva, sin asset. Color de token (`t.color.text.muted`).
- **Echo transitorio** del mensaje recién enviado (`pending.content`) mientras `sending` — feedback inmediato, no persistencia optimista (ver §E).
- **Autoscroll:** el `onContentSizeChange → scrollToEnd` existente ya cubre "aparece el thinking / llega la respuesta"; se añadió `Keyboard.addListener('keyboardDidShow', () => scrollToEnd())` para el caso "el contenido no cambió pero el teclado tapó el final".

---

## E. Architecture

| Elemento | Detalle |
|---|---|
| **KeyboardAvoidingView** | `padding` (iOS) / `height` (Android); envuelve toda la pantalla; el composer es hijo del flujo, no absolute. |
| **Fuente del estado "pensando"** | `const sending = sendState.status === 'sending'` — **el booleano ya existente**, ligado directamente al `await sendAiMessage(...)`. TRUE justo antes de la request; FALSE en OK, en error y al desmontar. **Sin delay artificial.** |
| **Echo temporal** | `{sending && pending ? <burbuja con pending.content> : null}` — burbuja con el look de la burbuja real del usuario, visible SOLO durante `sending`. **NO es actualización optimista** (ver §E.1). |
| **Animated dots** | `useRef([Animated.Value, ×3]).current` estable; `Animated.loop(Animated.sequence([delay, timing→1, timing→0.28, delay]))` con `useNativeDriver: true`. |
| **Cleanup** | `useEffect` return → `loops.forEach(l => l.stop())` + `values.forEach(v => v.setValue(0.28))`. El `Keyboard.addListener` → `sub.remove()`. Sin `setInterval`/`setTimeout` (cero timers huérfanos). |
| **Autoscroll** | `onContentSizeChange → scrollToEnd` (existente) + `keyboardDidShow → scrollToEnd` (nuevo). Sin scroll inteligente, sin botón "nuevos mensajes", sin persistencia de posición. |

### E.1 Invariante NO-OPTIMISTIC / echo

El mensaje transitorio mostrado durante `sending` **NO** sustituye la fuente canónica. El flujo final sigue dependiendo de `outcome.data.userMessage` + `outcome.data.assistantMessage` (`setState` los añade juntos en OK). El echo local:
- es únicamente feedback inmediato de que "esto se está enviando";
- usa el contenido ya enviado (`pending.content`, estado local ya rastreado para idempotencia);
- desaparece en cuanto llegan los mensajes canónicos (o el error);
- no persiste, no modifica backend, no altera el historial.

**No es persistencia optimista.** El gate `verify-ai-mobile-gate` §9 (`conversationSource.includes('outcome.data.userMessage, outcome.data.assistantMessage')`) sigue pasando.

---

## F. Isolation

| Área | Estado |
|---|---|
| Backend IA | **UNCHANGED** (`git diff` de `apps/backend` = vacío) |
| Contracts IA | **UNCHANGED** (`packages/contracts` = vacío) |
| Provider / `FakeAiProvider` / prompts server-side | **UNCHANGED** |
| Cuota diaria / consultas por día | **UNCHANGED** (`AiQuotaSummary`, `describeDailyQuota`, `getAiStatus` sin tocar) |
| Límites de turnos / rate limits | **UNCHANGED** (`resolveSendAvailability` sin tocar) |
| API client (`lib/api/ai.ts`) | **UNCHANGED** |
| Contrato de navegación / rutas (`ia/_layout.tsx`) | **UNCHANGED** |
| `app.json` (config Android, `windowSoftInputMode`) | **UNCHANGED** |
| Assets | **UNCHANGED** (sin asset nuevo) |
| Tokens globales | **UNCHANGED** |
| `ai-tutor-mark.tsx` / `ai-message-bubble.tsx` / `ai-disclaimer.tsx` / `ai-mode-selector.tsx` / `lib/ai/*` | **UNCHANGED** |

**Clasificación del incremento: MOBILE UX POLISH.**

---

## G. Contrato visual/UX final (Tutor IA V1)

### Home
Identidad Tutor IA (`AiTutorMark` + "Tu tutor personal de Zetrynd") · prompt "¿Qué quieres aprender hoy?" + "Resuelve dudas y aprende paso a paso." · composer real (input + selector "Automático" + enviar) · cuota diaria (del servidor) · disclaimer (del servidor, textual) · acceso ☰ al historial · **sin mini-scroll espurio** en viewport normal · `ScrollView` como red de seguridad responsive.

### Chat
Mensajes usuario / Tutor (respuesta sin burbuja, identidad discreta) · disclaimer superior · composer visible sobre el teclado · autoscroll mínimo (contenido + teclado) · feedback de "pensando" animado · "Reportar respuesta" (5 categorías del contrato) · avisos de error existentes (`safety_blocked` vs técnico, distintos) · navegación con back nativo al hub.

### NO se modifican
provider · prompts · consultas/día · free/premium · turn limits · backend · persistencia · analytics · safety · semántica de reintento/idempotencia.

---

## H. QA

**Samsung físico (device R5CW71R7MTP) — APPROVED** por el usuario tras el incremento final:
- Home visual correcto; mini-scroll corregido.
- Teclado / input usable; composer visible al escribir.
- Experiencia general correcta.
- Thinking indicator implementado; autoscroll implementado.
- Sin regresiones visuales detectadas.

El overhaul previo (AI-1→1J Home, AI-2A→2C Conversación) ya estaba aprobado y cerrado en su momento.

---

## I. Deferred Candidate APK QA

**Thinking indicator bajo latencia real del provider/API.**

El `FakeAiProvider` local puede responder demasiado rápido para evaluar: duración perceptible, ritmo visual, transición de los puntos, sensación real de espera, y la desaparición del indicador ante una respuesta con latencia real.

Esta observación se hará cuando exista un **Candidate APK con conexión al provider/API real**.

**Clasificación: DEFERRED CANDIDATE APK QA. NON-BLOCKING FOR V1 VISUAL CLOSURE.**

NO es un blocker, un bug, una feature incompleta ni deuda funcional. La implementación del estado "pensando" está **terminada** y protegida por: estado real `sendState.status === 'sending'`, cleanup de los loops de `Animated`, ruta de error que lo desmonta, lifecycle correcto, gates verdes y QA visual local. Lo único diferido es observarlo **bajo latencia real**.

---

## J. Gates

Ejecutados en HEAD `fa9b0ef`:

| Gate | Resultado |
|---|---|
| `pnpm --filter @axioma/mobile exec tsc --noEmit` | ✅ limpio |
| `pnpm --filter @axioma/mobile lint` | ✅ limpio |
| `verify:ai-mobile-gate` | ✅ **101 checks** — sin modificar el gate; todas las assertions de strings intactas |
| `verify:api-client-gate` | ✅ (11) |
| `verify:study-navigation-gate` | ✅ (18) — regresión (el acceso al Tutor desde Estudio no cambió) |
| `git diff --check` | ✅ limpio |

Sin gate nuevo: `verify-ai-mobile-gate` ya cubre las invariantes de la superficie (no proveedor, no cuota fabricada, no `z.object`, no `lib/offline`, tokens, mensajes canónicos, doble-toque, idempotencia). El nuevo `ai-thinking-indicator.tsx` no está en su lista fija de archivos escaneados, pero no contiene nada prohibido (token de color, sin palabras vetadas, sin deps).

---

## K. Non-blocking debt / deferred

| # | Ítem | Clasificación |
|---|---|---|
| K.1 | Thinking indicator bajo latencia real | **DEFERRED CANDIDATE APK QA** (§I) |
| K.2 | `behavior="height"` en Android puede producir un salto de un frame al abrir el teclado | deuda menor conocida del patrón; si QA en Candidate APK lo marca molesto, la alternativa es un listener de altura de teclado — no ahora. |

No hay más deuda real. No se inventa roadmap.

---

## L. Tag — decisión

**No se crea tag.** Tutor IA V1 es un cierre de sub-feature (refinamiento de superficie), sobre `lef-block-6-tutor-ia-complete` ya etiquetado. Sigue la misma política que `COMPETIR-V1` / `STUDY-V1-*` (cinco+ closure reports de sub-feature, cero tags). El tag del arco visual completo se decide en `ZETRYND-V1-VISUAL-REVIEW-CLOSURE-REPORT.md §Tag`.

---

## M. Git

- **Archivos cambiados por este cierre:** `docs/adr/TUTOR-IA-V1-CLOSURE-REPORT.md` + `docs/adr/ZETRYND-V1-VISUAL-REVIEW-CLOSURE-REPORT.md` (ambos nuevos). Nada más.
- **Un commit:** `docs(ui): close tutor and visual review v1`.
- **No push. No amend. No Railway. No emulator. Cero cambios de producto.**

---

## FINAL VERDICT

Tutor IA V1 entrega la superficie móvil refinada: Home sin scroll espurio (solo spacing), composer visible sobre el teclado en Home y en la conversación (`KeyboardAvoidingView behavior="height"` en Android, sin tocar `app.json`), y un indicador animado "Tutor IA está pensando" ligado al estado real del envío, con echo transitorio del mensaje enviado, autoscroll mínimo y cleanup correcto — todo sin tocar backend, contratos, proveedor, cuotas, límites, assets ni tokens. QA físico Samsung aprobado. Suite de gates mobile verde. La única verificación pendiente (animación bajo latencia real) queda **explícitamente diferida a Candidate APK QA, NON-BLOCKING**.

**TUTOR IA V1 — CLOSED.**
