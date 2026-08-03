# Block IV Closure Report — Primer Ciclo Completo de Aprendizaje

**Fecha de cierre**: 2026-08-02
**Fase**: Fase 1 — Vertical Slice M1
**Bloque**: IV de V (Roadmap AXIOMA Phase 1 Kickoff, §7.4)
**Documentos relacionados**: `docs/adr/0015-theming-foundation.md`
**Estado final**: **APPROVED**

## 1. Objetivo del bloque

Integrar todo lo construido en los Bloques I–III (Education, Integración Mobile↔Backend, Progress) en un único recorrido funcional real, sin datos simulados ni flujos parciales:

```
Abrir Axioma → Iniciar sesión → Acceder a Estudio → Seleccionar materia
→ Seleccionar unidad → Leer recurso → Responder preguntas
→ Retroalimentación inmediata → Guardar progreso automáticamente
→ Cerrar la aplicación → Regresar y continuar desde el mismo punto
```

Este es el hito principal de la Vertical Slice M1 (Kickoff, §7.4): la primera vez que un estudiante puede completar una sesión de estudio real usando exclusivamente Axioma.

## 2. Trabajo realizado

- **Recorrido real**: grilla de materias (`GET /education/subjects`, sin materias hardcodeadas) → detalle de materia (4 accesos del wireframe, solo Unidades funcional, el resto "Próximamente") → lista de Unidades con progreso real → pantallas nuevas **Recurso** y **Ejercicio** (separadas de la pantalla combinada de Bloque III).
- **Continuidad sin ampliar ADR-0014**: semántica de 3 estados (sin respuestas → Recurso; con respuestas pendientes → primera pregunta no respondida; todas respondidas → Unidad completada), derivada siempre de PROGRESS/EDUCATION real, nunca hardcodeada.
- **Home**: "Continuar estudiando" derivado de `pickContinueTarget()` (real); racha/nivel/liga como shells "Próximamente" — sin valores ficticios, sin aparentar sistemas funcionales inexistentes.
- **ADR-0015 — Theming Foundation** (nueva): tokens semánticos, `ThemeProvider` sobre `useColorScheme()` con fallback determinista, `useThemedStyles` memoizado, integración con el tema de React Navigation, familias completas `success/error/warning/info`. Migradas Home, Estudio, Unidades, Recurso, Ejercicio, tabs, y `LoadingState`/`ErrorState`/`EmptyState`.

## 3. Problemas encontrados durante la validación y cómo se resolvieron

| # | Hallazgo | Causa raíz | Resolución |
|---|---|---|---|
| 1 | Registro silencioso: la app no llegaba a `POST /auth/session` | `apps/mobile/.env` con `EXPO_PUBLIC_API_BASE_URL=http://localhost:3000` (valor de plantilla sin personalizar) — desde el teléfono, `localhost` apunta al propio teléfono | `.env` corregido a la IP real de la máquina de desarrollo; instrumentación temporal `[auth-debug]` agregada, usada para confirmar, y retirada por completo al cerrar |
| 2 | El tema nunca seguía al modo oscuro del sistema | `app.json` con `"userInterfaceStyle": "light"` — fuerza a nivel nativo (Android `uiMode`/iOS `UIUserInterfaceStyle`) que la app reporte siempre claro, sin importar el ajuste del SO; el resto de la cadena JS (`ThemeProvider`/`useTheme`/`useThemedStyles`) ya estaba correcto | `"userInterfaceStyle": "automatic"` |
| 3 | Contraste insuficiente en oscuro (tarjeta "Objetivo de hoy", shells "Próximamente", liga) | `background.inverse`/`text.onInverse` variaban por tema y en oscuro ambos quedaban oscuros a la vez (~1.2:1); `disabled.text` en oscuro ~3.6:1, bajo el mínimo AA (4.5:1) | Reestructuración de tokens sin duplicar arquitectura: `background.inverse`/`text.onInverse` fijos en ambos temas; nuevo `text.onAccent`; `disabled.*` renombrado a `action.*` con valores recalculados (~5.4:1); nuevo `navigation.{active,inactive}` y `text.muted` |
| 4 | Rutas fuera del recorrido de M1 (Competir, IA, Perfil, auth, onboarding, +not-found) ilegibles en oscuro | Nunca migradas a tokens — texto con color por defecto (negro) o grises fijos de claro sobre el fondo oscuro global heredado de la navegación | Alcance mínimo: solo `background`/`text.primary`/`text.secondary` en cada placeholder/pantalla, sin rediseñar ni migrar su arquitectura visual |
| 5 | `TextInput` de Login/Registro/Perfil con texto y placeholder casi negros en oscuro | Sin `color`/`placeholderTextColor`/`selectionColor` propios | Los 5 `TextInput` afectados ahora usan `text.primary`, `text.muted` (placeholder), `background.surface`, `border.default`, `accent.default` (cursor/selección) |

Todos los hallazgos fueron corregidos en la raíz (nunca con parches visuales aislados) y re-verificados antes de este cierre.

## 4. Evidencia de validación (2026-08-02)

| Verificación | Resultado |
|---|---|
| `pnpm -r typecheck` | **PASS** |
| `pnpm -r lint` | **PASS**, sin warnings |
| `pnpm -r build` | **PASS** |
| Validación en dispositivo Android físico | **PASS** — flujo completo de registro, inicio de sesión y navegación funcionando; backend conectado correctamente; modo claro y modo oscuro correctos; contraste revisado y corregido en todas las rutas visibles de la app |
| Instrumentación temporal | Retirada por completo — verificado por grep (`TEMP-DEBUG`, `auth-debug`, `console.log`), cero resultados |

Gate ampliado de ADR-0015 (10 puntos, incluyendo el punto 8 de verificación Android real): **satisfecho en su totalidad**.

## 5. Estado final

**APPROVED.** Bloque IV — Primer Ciclo Completo de Aprendizaje queda implementado, validado y cerrado. Un estudiante puede completar el recorrido principal de la Vertical Slice M1 usando exclusivamente Axioma, en modo claro u oscuro, sin datos simulados.

Siguiente paso del roadmap: **Bloque V — Refinamiento y Preparación** (Kickoff, §7.5).
