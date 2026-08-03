# ADR 0015 — Theming Foundation (Bloque IV, Vertical Slice M1)

- **Estado**: **Aprobada formalmente — gate completo en verde** (2026-08-02): `typecheck`/`lint`/`build` en PASS y validación real en dispositivo Android físico en PASS (registro, login, navegación, backend conectado, claro/oscuro, contraste en todas las rutas visibles). Incorpora 5 precisiones del usuario sobre la propuesta inicial (integración con el tema de navegación, memoización de `createStyles`, familias semánticas completas por estado, fallback determinista de `useColorScheme`, prohibición de hex hardcodeado sin justificación explícita) y 4 hallazgos reales corregidos durante la validación (ver "Validación" y "Cierre formal de Bloque IV").
- **Fecha**: 2026-08-02
- **Fase de aplicación**: Fase 1 — Vertical Slice M1, Bloque IV (Roadmap AXIOMA Phase 1 Kickoff, §7.4)
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — introduce una capa de infraestructura transversal nueva (tokens + provider) que toda pantalla futura deberá adoptar; no modifica ningún dominio de backend ni contrato de `packages/contracts`.

## Contexto

Ninguna pantalla del mobile app tiene hoy un sistema de theming: todas usan `StyleSheet.create` con valores hex fijos en el propio archivo (`estudio/index.tsx`, `[topicId].tsx`, `loading-state.tsx`, `error-state.tsx`, `empty-state.tsx`, tabs, etc.). No existe modo oscuro en ningún punto del código.

El usuario aprobó wireframes de Bloque IV (Home, Estudio, Unidades, Recurso, Ejercicio) en claro y oscuro, con una paleta semántica consistente entre ambos temas, y pidió explícitamente: *"un único sistema de temas... no dupliques componentes para claro/oscuro"*, con una *"fundación global... preparada para que futuras pantallas lo adopten sin crear una segunda arquitectura"*.

Este documento define esa fundación antes de tocar las 5 pantallas.

## Decisión

### 1. Tokens semánticos, no paleta cruda

Dos mapas de tokens (`light`, `dark`) derivados 1:1 de los wireframes ya aprobados. Nunca se referencia un hex directamente en una pantalla — siempre a través de un nombre semántico.

```ts
// apps/mobile/theme/tokens.ts
export const lightTokens = {
  color: {
    background: { default: '#F5F6F8', surface: '#FFFFFF', inverse: '#04203D' },
    border: { default: '#D3D1C7' },
    text: { primary: '#04203D', secondary: '#5F5E5A', onInverse: '#F5F6F8' },
    accent: { default: '#378ADD', strong: '#185FA5', strongest: '#0C447C', subtleBg: '#E6F1FB' },
    disabled: { text: '#888780', background: '#F1EFE8', border: '#B4B2A9' },
    state: {
      success: { text: '#3B6D11', background: '#EAF3DE', border: '#C3DDA0' },
      error:   { text: '#B3261E', background: '#FBE9E7', border: '#F0BAB4' },
      warning: { text: '#854F0B', background: '#FCEFD8', border: '#EAC584' },
      info:    { text: '#0C447C', background: '#E6F1FB', border: '#B7D6F2' },
    },
  },
} as const;

export const darkTokens = {
  color: {
    background: { default: '#010B16', surface: '#0A1D30', inverse: '#0C447C' },
    border: { default: '#17324D' },
    text: { primary: '#F5F6F8', secondary: '#85B7EB', onInverse: '#04203D' },
    accent: { default: '#378ADD', strong: '#378ADD', strongest: '#85B7EB', subtleBg: '#0A1D30' },
    disabled: { text: '#5F7C97', background: '#0A1D30', border: '#17324D' },
    state: {
      success: { text: '#8FCB63', background: '#132A0C', border: '#2C4A1D' },
      error:   { text: '#F2A399', background: '#2A0F0C', border: '#4A2620' },
      warning: { text: '#E8C077', background: '#2E2408', border: '#4A3B15' },
      info:    { text: '#85B7EB', background: '#0A1D30', border: '#17324D' },
    },
  },
} as const;

export type ThemeTokens = typeof lightTokens;
```

**Precisión 3 (usuario)**: cada estado semántico (`success`, `error`, `warning`, `info`) es ahora una familia completa `{ text, background, border }`, no un color reutilizado para todo — evita, por ejemplo, usar el mismo verde como texto sobre fondo blanco y como fondo de una tarjeta a la vez sin control de contraste. Ninguno de los 4 estados existía completo en los wireframes aprobados (solo se vio éxito en claro, en la tarjeta de liga de Home — que de todas formas queda como shell estático) — los 4 son una extrapolación mía siguiendo la misma relación tonal ya validada en Unidades/Ejercicio (texto saturado + fondo del mismo tono muy claro/muy oscuro + borde intermedio). Quedan marcados aquí para que la revisión visual del gate los confirme antes de darlos por buenos, no se dan por aprobados solo por estar en este documento.

### 2. `ThemeProvider` — sigue el tema del sistema, con fallback determinista, sin toggle manual

```ts
// apps/mobile/theme/theme-provider.tsx
const ThemeContext = createContext<{ tokens: ThemeTokens; scheme: 'light' | 'dark' } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme(); // React Native core -- sin dependencia nueva
  // Precisión 4 (usuario): useColorScheme() puede devolver `null`/`undefined`
  // durante el primer render nativo o en Web antes de hidratar -- nunca se deja
  // sin resolver. Fallback determinista: 'light', mismo criterio que ya usan
  // los wireframes como tema por defecto en las capturas "sin sufijo".
  const scheme: 'light' | 'dark' = systemScheme === 'dark' ? 'dark' : 'light';
  const tokens = scheme === 'dark' ? darkTokens : lightTokens;
  const value = useMemo(() => ({ tokens, scheme }), [tokens, scheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() fuera de ThemeProvider');
  return ctx.tokens;
}

export function useColorSchemeName(): 'light' | 'dark' {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useColorSchemeName() fuera de ThemeProvider');
  return ctx.scheme;
}
```

No hay preferencia persistida ni switch manual: no existe ninguna superficie de ajustes en M1 (Perfil avanzado está fuera de alcance de toda la Vertical Slice, sección 5.2 del Kickoff) desde donde el usuario pudiera cambiarlo. Seguir `useColorScheme()` es la opción más simple que resuelve el requisito real (Master Context, principio de simplicidad; mismo criterio que ADR-0014 usó para preferir `AppState` sobre `NetInfo`). Si en un bloque futuro aparece una pantalla de ajustes, un toggle manual se añade *sobre* este mismo `ThemeProvider` (estado local + override), no reemplazándolo.

`ThemeProvider` se monta una vez en `apps/mobile/app/_layout.tsx`, envolviendo el árbol completo (por eso "toda la app" queda técnicamente cubierta), aunque solo las pantallas listadas en el punto 4 leen `useTheme()` en este bloque. `useColorScheme()` de React Native ya se suscribe a cambios en caliente del sistema (evento nativo `Appearance.addChangeListener`, sin polling) — un cambio de tema del sistema mientras la app está abierta re-renderiza `ThemeProvider` y toda pantalla que lea `useTheme()`, sin reiniciar la app.

### 2.1 Precisión 1 (usuario): el mismo tokens alimenta el tema de navegación

Expo Router monta un `NavigationContainer` (React Navigation) por debajo, que tiene su propio concepto de tema (`DefaultTheme`/`DarkTheme` de `@react-navigation/native`) independiente del `ThemeContext` de esta ADR. Si no se sincronizan, el header nativo, el fondo de transición entre pantallas y la barra de estado pueden quedar claros un instante mientras el resto de la UI ya está en oscuro (el "flash" que el usuario pidió evitar).

```ts
// apps/mobile/app/_layout.tsx
import { ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';

function RootLayoutInner() {
  const scheme = useColorSchemeName();
  const tokens = useTheme();
  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: tokens.color.background.default,
        card: tokens.color.background.surface,
        text: tokens.color.text.primary,
        border: tokens.color.border.default,
        primary: tokens.color.accent.default,
      },
    };
  }, [scheme, tokens]);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutInner />
    </ThemeProvider>
  );
}
```

`NavigationThemeProvider` de React Navigation queda derivado de los mismos `tokens` (`apps/mobile/theme/tokens.ts`) — nunca un segundo mapa de colores paralelo. `expo-status-bar` (ya en el proyecto, sin dependencia nueva) sigue al mismo `scheme` para que los iconos de la barra de estado del sistema sean legibles en ambos temas.

### 3. Estilos dinámicos — patrón `createStyles(tokens)`, memoizado y estable

`StyleSheet.create` estático a nivel de módulo no puede reaccionar a un cambio de tema en caliente. Patrón único para toda pantalla migrada, centralizado en un hook compartido (no reinventado por archivo):

```ts
// apps/mobile/theme/use-themed-styles.ts
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: (tokens: ThemeTokens) => T,
): T {
  const tokens = useTheme(); // referencia estable: lightTokens/darkTokens son const de módulo
  // Precisión 2 (usuario): useMemo evita reconstruir el objeto de estilos en
  // cada render -- solo se recalcula cuando `tokens` cambia de referencia, es
  // decir, solo cuando el tema realmente cambia (light<->dark), nunca por un
  // re-render ajeno (ej. escribir en un input de la misma pantalla).
  return useMemo(() => StyleSheet.create(factory(tokens)), [tokens, factory]);
}
```

Uso en pantalla:

```ts
const styles = useThemedStyles((t) => ({
  container: { backgroundColor: t.color.background.default },
  title: { color: t.color.text.primary },
}));
```

`factory` se declara **fuera** del cuerpo del componente (a nivel de módulo, como una función con nombre) para que su identidad también sea estable entre renders y no invalide el `useMemo` por una recreación de la función en sí — mismo defecto que tendría pasar un objeto/función inline a un `useEffect` sin memoizar. Un lint check (`eslint-plugin-react-hooks`, ya en el proyecto) marca la variante inline como sospechosa.

Mismo patrón para las 5 pantallas, los tabs y los 3 componentes de estado — una sola forma de escribir una pantalla themeada en todo el proyecto, no una convención por archivo.

### 3.1 Precisión 5 (usuario): cero color hardcodeado sin justificación explícita

Ninguna pantalla migrada declara un valor hex/rgb directamente en su `factory` de estilos — todo pasa por `t.color.*`. Las únicas excepciones permitidas son valores que no son "color de interfaz" sino datos/contenido externo ya resueltos:

- El `svg` de fórmulas (`ContentBlockRenderer`, fuera del alcance de migración) — no es un color de tema, es contenido matemático generado por el servidor (ADR-0002).
- Colores dentro de una imagen (`block.image.url`) — contenido, no interfaz.
- `transparent` y valores puramente estructurales sin connotación de color (ej. `'rgba(0,0,0,0)'` para un overlay invisible) — no representan una decisión de paleta.

Cualquier otra excepción debe llevar un comentario en la línea inmediatamente anterior explicando por qué ese punto no puede expresarse como token (ej. un color exigido por una librería nativa de terceros que no acepta un token dinámico) — el gate de este bloque incluye una búsqueda de literales `#[0-9A-Fa-f]{3,8}` en las pantallas migradas y falla si aparece uno sin ese comentario adyacente.

### 4. Alcance de migración de este bloque (cerrado explícitamente por el usuario)

Migran a `useTheme()`/`createStyles()`:

- `(tabs)/index.tsx` (Home — reescritura completa de todas formas, ver alcance de producto)
- `(tabs)/estudio/index.tsx` (Estudio + selección de materia)
- Unidades (vista ya contenida en `estudio/index.tsx` tras la resolución del punto 3 de alcance de materias, o pantalla propia si la separación de rutas lo amerita — se define en la propuesta de implementación, no aquí)
- Nueva pantalla Recurso
- Nueva pantalla Ejercicio
- `(tabs)/_layout.tsx` (colores de tab bar activa/inactiva, iconos, fondo)
- `components/loading-state.tsx`, `components/error-state.tsx`, `components/empty-state.tsx`

**No migran** en este bloque: `competir.tsx`, `ia.tsx`, `perfil.tsx`, `coming-soon-placeholder.tsx`, `content-block-renderer.tsx` (estilos internos), pantallas de `(auth)/*`, `onboarding.tsx`. Deben seguir renderizando exactamente igual que hoy — `ThemeProvider` en la raíz no altera su comportamiento porque no leen `useTheme()`. Se verifica explícitamente en el gate de este bloque que ninguna de ellas se rompe visualmente ni en tipos.

### 5. Sin dependencia nueva

`useColorScheme` es de `react-native` core. Contexto de React es del propio React. No se añade ninguna librería de theming (`styled-components`, `restyle`, `nativewind`, etc.) — coherente con el criterio ya usado en ADR-0011/ADR-0014 de agotar el núcleo de React Native antes de sumar una dependencia.

## Explícitamente fuera de alcance

- Toggle manual de tema (no hay superficie de ajustes en M1).
- Persistencia de preferencia de tema (no aplica sin toggle).
- Migración de `competir.tsx`, `ia.tsx`, `perfil.tsx`, `coming-soon-placeholder.tsx`, pantallas de auth/onboarding.
- Temas adicionales al binario claro/oscuro (alto contraste, tamaños de fuente, etc. — no pedidos, no evidenciados).
- Theming de contenido educativo en sí (el `svg` de fórmulas y las imágenes ya vienen resueltas del servidor, ADR-0002/ADR-0010 — no se recolorean dinámicamente).

## Impacto cruzado sobre dominios existentes

- **Ninguno sobre backend ni `packages/contracts`** — esto es exclusivamente mobile/presentación.
- **Navegación (ADR-0009)**: la estructura y nombres de tabs no cambian, solo su color; sin impacto en el árbol de rutas.
- **ADR-0013 (Loading/Error/Empty)**: los 3 componentes cambian de estilos estáticos a `createStyles(tokens)` — mismo comportamiento/API pública (`message`, `onRetry`), sin romper a quien ya los usa fuera del alcance de este bloque.
- **ADR-0002/ADR-0010**: sin cambios — `ContentBlockRenderer` no está en el alcance de migración de este bloque (puede quedar visualmente "fijo en claro" dentro de una pantalla ya themeada; se revisa si eso se nota mal en la verificación visual, sin bloquear el bloque por esto).

## Alternativas descartadas

- **Librería de theming de terceros** (`nativewind`, `restyle`, `tamagui`) — descartada: no hay necesidad demostrada que el núcleo de React Native no resuelva; añadiría una dependencia y una curva de aprendizaje nueva para dos temas y un puñado de tokens.
- **Theme Context con valores hex directos** (sin capa semántica) — descartada: acoplaría cada pantalla a la paleta específica de este wireframe; un tono semántico (`text.primary`) sobrevive un rediseño de paleta sin tocar las pantallas.
- **Persistir preferencia de tema ahora "por si acaso"** — descartada: no hay UI desde donde fijarla en M1; se añade cuando exista esa necesidad real (mismo principio de evidencia-antes-que-suposición de ADR-0014).
- **Migrar toda la app de una vez** (incluyendo Competir/IA/Perfil) — descartada explícitamente por el usuario: amplía el alcance de Bloque IV más allá de lo aprobado.

## Consecuencias

- Toda pantalla nueva a partir de este bloque tiene una única forma correcta de leer color: `useTheme()` + `useThemedStyles()`. Un review que encuentre un hex literal sin justificación en una pantalla nueva señala una desviación de este ADR, no una alternativa válida.
- Las pantallas no migradas quedan en un estado mixto temporal (sin tema) hasta que un bloque futuro las adopte — riesgo aceptado y documentado, no accidental.
- Si aparece una pantalla de ajustes en una fase posterior, el toggle manual se implementa como una extensión de `ThemeProvider` (estado + override sobre `useColorScheme()`), sin tocar los tokens ni el patrón `useThemedStyles`.
- El tema de React Navigation queda acoplado a los mismos tokens — un cambio de paleta futuro se hace en un solo archivo (`tokens.ts`) y se propaga tanto a las pantallas como al header/fondo de navegación sin tocar `_layout.tsx`.

## Validación (gate ampliado por el usuario)

Este bloque se considera cerrado solo cuando, además del gate funcional de Bloque IV (ver propuesta de implementación), se verifica explícitamente:

1. Cambiar el tema del sistema operativo con la app abierta (sin reiniciarla) actualiza las 5 pantallas, los tabs y los 3 componentes de estado de inmediato.
2. Navegación y tabs (header, fondo de transición, tab bar, `StatusBar`) quedan tematizados — sin mezclar un tema de UI con otro de navegación.
3. Ausencia de "flash" claro perceptible al abrir la app o navegar entre pantallas con el sistema en modo oscuro.
4. Estados semánticos correcto/incorrecto (Ejercicio), completado (Unidades/Progreso) y "Próximamente" (accesos deshabilitados de Estudio, shells de Home) son legibles y distinguibles en ambos temas — verificación de contraste, no solo de que "se ve algo".
5. `LoadingState`, `ErrorState`, `EmptyState` verificados visualmente en claro y en oscuro.
6. Cambiar de tema a mitad de un flujo (ej. con una pregunta a medio responder) no pierde navegación ni datos en pantalla.
7. Fórmulas SVG e imágenes del recurso siguen siendo visibles y legibles sobre el fondo de ambos temas (aunque `ContentBlockRenderer` no esté migrado — se verifica que el contraste heredado del claro no se vuelve ilegible dentro de una pantalla ya en oscuro).
8. Verificación en Android real (dispositivo/emulador) alternando el tema del sistema durante el recorrido.
9. Regresión visual y de tipos en las pantallas explícitamente no migradas (`competir.tsx`, `ia.tsx`, `perfil.tsx`, `coming-soon-placeholder.tsx`, auth, onboarding) — deben verse y compilar exactamente igual que antes de este bloque.
10. Búsqueda de literales de color hardcodeados en las pantallas migradas sin comentario de justificación adyacente → debe dar cero resultados.

## Resultado de la implementación (2026-08-02)

Implementado: `theme/tokens.ts`, `theme/theme-provider.tsx`, `theme/use-themed-styles.ts`, integración en `app/_layout.tsx` (navegación + `StatusBar`) y `(tabs)/_layout.tsx`; migradas Home, Estudio (grilla de materias), detalle de materia, Unidades, Recurso (nueva), Ejercicio (nueva), y `LoadingState`/`ErrorState`/`EmptyState`. `ContentBlockRenderer` se migró parcialmente más allá del alcance original (solo color de texto y el `color` de `SvgXml` para `currentColor` de MathJax) porque dejarlo sin tocar producía texto y fórmulas ilegibles sobre fondo oscuro -- ver "Hallazgo durante la implementación" abajo.

Grep de `#[0-9A-Fa-f]{3,8}` sobre las 5 pantallas, tabs, y los 3 componentes de estado (excluyendo `theme/tokens.ts`, su única fuente legítima) → **cero resultados** (punto 10 del gate, verificado 2026-08-02).

### Hallazgo durante la implementación: `ContentBlockRenderer` sí necesitaba theming parcial

La propuesta original excluía `ContentBlockRenderer` del alcance de migración. Al implementar Recurso/Ejercicio se hizo evidente que un `paragraph`/`heading` con `color: '#222'` fijo es ilegible sobre un fondo casi negro (`#010B16`/`#0A1D30`), y que el `svg` de fórmulas (MathJax) dibuja los glifos con `fill="currentColor"` en su nodo raíz (comportamiento estándar de `mathjax-full`'s output SVG, confirmado leyendo `formula-rendering.ts`) -- por lo que SÍ es tematizable sin reabrir ADR-0002 ni regenerar nada en el servidor: `SvgXml` (react-native-svg) resuelve `currentColor` a partir de su prop `color`. Se migró únicamente `heading`/`paragraph` (color de texto) y el `color` pasado a `SvgXml` -- `formulaContainer` e `image` siguen sin cambios, y el LaTeX/SVG servido nunca se regenera ni se reinterpreta en el cliente.

### Segundo ajuste de flujo, detectado al implementar Ejercicio

El diseño inicial recalculaba "pregunta a mostrar" como "primera pregunta sin responder" en cada render. Eso significa que, al responder, el mismo ciclo de render que actualiza `answers` también recalcula la pregunta mostrada hacia la siguiente pendiente -- la retroalimentación (Correcto/Incorrecto + explicación) de la pregunta recién respondida nunca llegaría a mostrarse, violando el criterio de cierre "recibir retroalimentación inmediata" (Kickoff, §5.1/9.1). Corregido: `displayedQuestionVersionId` es un estado independiente que solo avanza cuando el estudiante pulsa "Continuar" (visible una vez que `isCorrect` deja de ser `null`), nunca automáticamente al responder.

### Hallazgo real de validación Android #1: el tema nunca seguía al sistema

`app.json` tenía `"userInterfaceStyle": "light"` -- esto no es cosmético: Expo lo traduce a configuración nativa (Android: `uiMode` forzado a claro para la app; iOS: `UIUserInterfaceStyle=Light` en Info.plist), por lo que `Appearance`/`useColorScheme()` de React Native **estructuralmente no podía devolver `'dark'`** para esta app, sin importar cuán correcto fuera el resto de `ThemeProvider`/`useTheme`/`useThemedStyles`. Verificado: los 5 puntos de la cadena JS (Provider recibe `useColorScheme()`, envuelve toda la navegación, `useTheme()` sin contexto obsoleto, `createStyles` memoizado correctamente sobre `[tokens, factory]`, sin fallback permanente a claro) ya estaban correctos -- el bug estaba una capa por debajo de React, en la señal que el SO le entrega a la app. Corrección: `"userInterfaceStyle": "automatic"`. Como es configuración nativa (no JS), requiere reiniciar la app por completo (no basta Fast Refresh); en un dev client compilado requeriría reinstalar el build.

### Hallazgo real de validación Android #2: contraste insuficiente en oscuro

`background.inverse` (superficie de la tarjeta "Objetivo de hoy") tenía un valor DISTINTO por tema (`#0C447C` en oscuro) mientras que `text.onInverse` (su texto) también cambiaba por tema (`#04203D` en oscuro) -- ambos oscuros a la vez sobre esa tarjeta, contraste real ~1.2:1. Por separado, `disabled.text` en oscuro (`#5F7C97`) daba ~3.6:1 contra su propio fondo (`disabled.background`), por debajo del mínimo AA (4.5:1) para texto normal -- afectaba "Nivel y XP", la tarjeta de Liga, y los accesos "Próximamente" de Estudio.

Corrección de raíz (no parche visual): se reestructuró la taxonomía de tokens sin crear una segunda arquitectura --

- `background.inverse` y su texto (`text.onInverse`) pasan a ser **constantes fijas iguales en ambos temas** (`#04203D` / `#F5F6F8`) -- es una superficie de marca, no un valor relativo al tema, igual que ya lo era `accent.default`.
- Nuevo `text.onAccent` (`#04203D`, fijo) para texto sobre `accent.default` (el azul brillante del botón "Continuar") -- antes se reutilizaba `background.inverse` como proxy de "texto oscuro", que en oscuro ya no correspondía a ningún par de contraste verificado.
- `disabled.*` se renombra a `action.{disabledText,disabledBackground,disabledBorder}`; `disabledText` en oscuro sube a `#7E93A8` (~5.4:1, antes ~3.6:1).
- Nuevo `navigation.{active,inactive}`, separado de `text.secondary`, para poder afinar contraste de los tabs sin tocar texto de cuerpo (`inactive` oscuro: `#9FB6CE`, ~8.2:1, con margen extra sobre el mínimo AA para etiquetas pequeñas).
- Nuevo `text.muted` para texto de baja énfasis pero legible (AA, ≥4.5:1), reemplazando reutilizaciones ad hoc de `disabled.text` para ese propósito.

Todos los ratios de contraste citados se calcularon con la fórmula de luminancia relativa de WCAG 2.1 contra el fondo real donde aparece cada texto. Sin cambios de layout ni de paleta general -- únicamente tokens semánticos y qué token usa cada superficie. Verificado por grep que no queda ninguna referencia a `color.disabled.*` (nombre anterior) en el árbol de pantallas/componentes/theme.

### Hallazgo real de validación Android #3: rutas fuera del recorrido de M1 ilegibles en oscuro

Competir, IA, Perfil, y las pantallas de auth/onboarding heredan el fondo oscuro global (vía `NavigationThemeProvider`) pero nunca se migraron a `useThemedStyles` -- su texto seguía con el color por defecto de RN (negro) o grises fijos de claro (`#666`), casi ilegible sobre fondo oscuro. Corrección de alcance mínimo, sin rediseñar ni migrar su arquitectura visual: `ComingSoonPlaceholder` (cubre Competir/IA de una vez), `perfil.tsx`, `(auth)/index.tsx`, `register.tsx`, `forgot-password.tsx`, `onboarding.tsx` y `+not-found.tsx` pasan `container`/`title`/`meta`-`note` por `background.default`/`text.primary`/`text.secondary` únicamente -- inputs, botones y lógica quedaron intactos.

### Hallazgo real de validación Android #4: `TextInput` sin tematizar

Con las pantallas ya legibles, quedó un último punto ciego: los 5 `TextInput` de Login, Registro y Perfil no tenían `color` propio (heredaban negro por defecto) ni `placeholderTextColor`/`selectionColor`/`cursorColor` -- el texto escrito y el placeholder quedaban casi invisibles en oscuro. Corregido: cada `TextInput` usa `color: text.primary`, `backgroundColor: background.surface`, `borderColor: border.default`, `placeholderTextColor={text.muted}`, `selectionColor`/`cursorColor={accent.default}`. Se revisaron los botones deshabilitados (`opacity: 0.5` sobre el `Pressable` completo) -- el contraste interno texto/fondo del botón (`#fff`/`#111`) no se ve afectado por esa opacidad de grupo, solo su prominencia contra la página; no se encontró un caso real insuficiente, no se modificó su comportamiento ni su estilo.

## Cierre formal de Bloque IV (2026-08-02)

Validación final ejecutada en el entorno real del proyecto, los cuatro hallazgos de esta sección corregidos y re-verificados:

| Verificación | Resultado |
|---|---|
| `pnpm -r typecheck` | **PASS** |
| `pnpm -r lint` | **PASS** (sin warnings) |
| `pnpm -r build` | **PASS** |
| Validación Android, dispositivo físico | **PASS** — registro, login, navegación completa, backend conectado, claro/oscuro, contraste en todas las rutas visibles |
| Instrumentación temporal (`TEMP-DEBUG`/`auth-debug`) | Retirada, verificado por grep — cero resultados |

El gate ampliado de la sección "Validación" (10 puntos) queda satisfecho en su totalidad, incluyendo el punto 8 (Android real), sin pendientes abiertos.

**Bloque IV -- Primer Ciclo Completo de Aprendizaje: implementado, validado y cerrado (2026-08-02). Ver `docs/adr/BLOCK-IV-CLOSURE-REPORT.md` para el reporte de cierre consolidado.**
