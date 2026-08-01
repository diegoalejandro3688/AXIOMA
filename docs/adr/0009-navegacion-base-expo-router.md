# ADR 0009 — Navegación base (Expo Router)

- **Estado**: Aprobada, con los siete ajustes obligatorios del usuario ya incorporados — verificado con `pnpm --filter @axioma/mobile run typecheck`/`lint` en verde y con un recorrido real en navegador (`expo start --web` + Browser tool) sobre cada escenario del gate, no solo lectura de código.
- **Fecha**: 2026-08-01
- **Fase de aplicación**: Fase 0 — Foundation, Paso 9
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — establece la arquitectura de navegación sobre la que crecerá el resto del producto; agrega una dependencia nueva.

## Contexto

La Implementation Matrix v1.1 incluye "navegación (5 módulos)" en Fase 0. Antes de codificar, el usuario pidió confirmar la nomenclatura y el orden exactos contra PRD y App Map, y señalar cualquier contradicción en vez de elegir por conveniencia.

### Contradicción real encontrada y resuelta

| Posición | Master Context (4.2) | PRD (8.3) | App Map (3) |
|---|---|---|---|
| 1 | Inicio | Home | Inicio |
| 2 | Estudio | Estudio | Estudiar |
| 3 | **Competir** | **Juego** | Competir |
| 4 | IA | IA | IA |
| 5 | Perfil | Perfil | Perfil |

- **Posición 3 es una contradicción de fondo, no de forma**: el PRD usa "Juego"; Master Context usa "Competir". Master Context 4.24 resuelve esto explícitamente: *"No utilizar una denominación retirada para Competir"* — confirma que existe un nombre retirado para ese módulo, que es exactamente "Juego" (el que quedó sin actualizar en el PRD). Por la jerarquía de autoridad ya establecida en este proyecto (Master Context > PRD > Data Model > App Map > User Flows), se usa **"Competir"**.
- **"Home" vs "Inicio" no es una contradicción real**: Master Context 3.19 (Convenciones de nomenclatura técnica) mapea explícitamente "Inicio → Home" como *nombre de producto → nombre técnico preferido* — son dos capas, no dos opciones en competencia.
- **"Estudio" vs "Estudiar"**: confirmado -- Master Context y PRD coinciden en "Estudio"; el App Map tiene el drift ya detectado en una revisión anterior del proyecto.
- **Orden y pestaña inicial**: los tres documentos coinciden en posición 1 (Inicio/Home) y 5 (Perfil); Master Context 4.2 fija el orden completo: **Inicio, Estudio, Competir, IA, Perfil**, con Inicio como pestaña inicial.

## Decisión

### Alcance: arquitectura de rutas, no funcionalidad ni integración real

Se construye el árbol de navegación completo del App Map (Splash → auth → onboarding → Home con 5 módulos) como shell navegable real, verificable de punta a punta -- sin SDK de Firebase, sin llamadas al backend (ni siquiera Perfil, cuyo backend ya existe desde ADR-0008: sin sesión real, no hay con qué autenticar la llamada), sin pantallas globales de red, sin splash nativo de marca. Cada uno de esos puntos es un bloque de trabajo propio que merece su propio paso.

### Separación explícita: autenticación, onboarding, estado local de UI (ajuste 1)

Tres conceptos deliberadamente independientes, cada uno con su propio mecanismo:

1. **`MockAuthProvider`** (`lib/auth/mock-auth-provider.tsx`) -- Context de React, estado `loading | unauthenticated | authenticated`, **enteramente en memoria** (`useState`). `login()`/`logout()` solo mutan ese estado. Nada se persiste: recargar la app siempre vuelve a `unauthenticated` -- verificado empíricamente (recarga completa del navegador tras autenticarse → vuelve a Login). El estado `loading` se ejercita con un `setTimeout(0)` (sin I/O real todavía), dejando el mismo contrato (`status`, `login`, `logout`) listo para cuando se implemente el proveedor real de Firebase, sin tener que tocar el árbol de navegación.
2. **`OnboardingProvider`** (`lib/onboarding/onboarding-provider.tsx`) -- estado `loading | incomplete | complete`, respaldado por AsyncStorage a través de la capa centralizada. Es el único estado que sobrevive a un reinicio.
3. **AsyncStorage** -- solo para `hasCompletedOnboarding`, nunca para nada que implique autenticación.

### Máquina de estados declarativa con `Stack.Protected` (ajustes 2 y 3)

Se confirmó que `Stack.Protected`/`ProtectedProps` existe en `expo-router@6.0.24` (la versión ya instalada, sin actualizar). `app/_layout.tsx` implementa exactamente:

```
loading (auth u onboarding) -> FullScreenLoader
!isAuthenticated             -> solo (auth) es alcanzable
isAuthenticated && !completo -> solo onboarding es alcanzable
isAuthenticated && completo  -> solo (tabs) es alcanzable
```

`Stack.Protected` desmonta por completo la(s) rama(s) cuyo `guard` es falso -- no quedan en el historial de navegación de React Navigation. Verificado empíricamente (no solo argumentado):
- Ningún flash de ruta incorrecta observado en ningún tránsito (login→onboarding→tabs→logout→login).
- Un enlace directo a `/perfil` estando `unauthenticated` redirige limpiamente a Login (la URL del navegador vuelve a `/`).
- No fue necesario ningún `router.replace()` manual adicional -- `Stack.Protected` ya produce el efecto de "replace" pedido (sin poder volver atrás a una rama que dejó de existir), porque React Navigation reconstruye el estado de la pila cuando la rama protegida cambia. Se documenta aquí en vez de agregar llamadas redundantes.
- `+not-found.tsx` cubre rutas desconocidas, con enlace a `/` que vuelve a evaluar la máquina de estados.

### AsyncStorage, no `expo-secure-store` (dependencia nueva)

Única dependencia agregada: `@react-native-async-storage/async-storage@2.2.0` (versión resuelta por `expo install` para el SDK 54 instalado). Justificación: hoy solo se guarda un booleano no sensible: usar almacenamiento "seguro" sería prematuro antes de que exista una credencial real que proteger. **Decision Gate pendiente, no resuelto aquí**: cuando se implemente el login real con Firebase, ese paso deberá decidir explícitamente el mecanismo de almacenamiento seguro para el idToken/sessionId (`expo-secure-store` u otro). Beneficio práctico adicional: `AsyncStorage` funciona en web (a diferencia de `expo-secure-store`), lo que permitió verificar todo el flujo con el Browser tool antes de probar en dispositivo/emulador.

### Capa centralizada de AsyncStorage (ajuste 5)

`lib/storage/local-flags.ts`: clave versionada (`axioma.v1.hasCompletedOnboarding`), lectura/escritura envueltas en `try/catch`. Un dato corrupto o un fallo de lectura nunca lanza ni bloquea el arranque -- cae al default seguro `false` (mostrar el onboarding de nuevo es preferible a saltárselo por un dato ilegible). Verificado inyectando un valor JSON inválido directamente en el almacenamiento y confirmando que la app cae a `incomplete` sin error en consola.

### Placeholders: componente común, sin datos falsos (ajuste 6)

`ComingSoonPlaceholder` (`components/coming-soon-placeholder.tsx`), usado por Estudio, Competir, IA y Perfil -- título con `accessibilityRole="header"`, mensaje fijo ("Próximamente."), sin XP/racha/métricas simuladas. Inicio tiene su propio placeholder mínimo (semánticamente distinto: orienta al estudio, no es un módulo "próximamente"). Perfil agrega, fuera del componente compartido, un botón real de "Cerrar sesión (simulado)" que invoca `MockAuthProvider.logout()` -- necesario para poder probar la transición autenticado→no-autenticado de punta a punta.

## Alternativas descartadas

- **Persistir una bandera `hasSession` en AsyncStorage** -- descartada por el usuario (ajuste 1): habría hecho pasar una simulación por una sesión real.
- **`expo-secure-store`** -- descartada para este paso: no hay todavía una credencial real que proteger; además no funciona en web, lo que habría impedido verificar con el Browser tool.
- **Navegación imperativa con `router.replace()` manual** -- descartada a favor de `Stack.Protected`, que resuelve el mismo problema (evitar volver atrás a una ruta inválida) de forma declarativa y ya verificada.
- **"Juego" como nombre del tercer módulo** -- descartado: Master Context lo señala expresamente como denominación retirada.
- **Pantallas globales de red (Sin conexión, Error del servidor)** -- descartadas para este paso: dependen de detección de conectividad, que pertenece al trabajo de sync offline ya diferido.

## Consecuencias

- El proveedor real de Firebase deberá implementar el mismo contrato (`status: loading|unauthenticated|authenticated`, `login`, `logout`) que `MockAuthProvider` -- reemplazarlo no debería requerir cambios en `app/_layout.tsx` ni en `Stack.Protected`.
- Antes de implementar el login real, queda pendiente el Decision Gate de almacenamiento seguro de credenciales (`expo-secure-store` u otro) -- no resuelto en este ADR.
- Perfil conectado a `GET/PATCH /user/profile` (ADR-0008) queda como trabajo futuro explícito, una vez exista una sesión real con la que autenticar la llamada.
- Cualquier pantalla nueva de alguno de los 5 módulos debe integrarse dentro de su grupo de rutas existente (`(tabs)/estudio.tsx`, etc.), no crear una sexta pestaña ni duplicar rutas -- ver restricción de Master Context 4.24.

## Validación

- `pnpm --filter @axioma/mobile run typecheck` y `lint` (ampliado para cubrir también `lib/` y `components/`, no solo `app/`) en verde.
- `pnpm -r run typecheck`/`lint` (todo el monorepo) en verde -- sin cambios necesarios en CI, ya que esos comandos ya son recursivos y cubren `apps/mobile` automáticamente.
- Verificación real en navegador (`expo start --web` + Browser tool), no solo lectura de código:
  - Login → "Continuar" → Onboarding → "Comenzar" → Tabs (5 módulos, orden y nombres exactos: Inicio, Estudio, Competir, IA, Perfil).
  - Perfil → "Cerrar sesión (simulado)" → vuelve a Login.
  - Recarga completa del navegador tras autenticarse → vuelve a Login (la autenticación simulada NO sobrevive).
  - Segundo login tras completar onboarding una vez → salta directo a Tabs (onboarding NO se repite; es lo único persistido).
  - Acceso directo a `/perfil` estando no autenticado → redirige a Login, sin mostrar contenido protegido.
  - Ruta desconocida (`/this-route-does-not-exist`) → `+not-found`, con enlace funcional de vuelta.
  - `AsyncStorage` corrupto (valor JSON inválido inyectado directamente) → cae a `incomplete` (muestra onboarding), sin excepción en consola, sin bloquear el arranque.
  - Ningún import de Firebase, `fetch` a la API, ni llamada de red observada durante el recorrido.

**Pendiente no bloqueante**: verificación en dispositivo/emulador nativo (iOS/Android) -- este paso se validó en web por ser la superficie más rápida de iterar y la única compatible con `AsyncStorage` + Browser tool; no hay razón para esperar comportamiento distinto en nativo dado que `Stack.Protected`, `AsyncStorage` y los Contexts de React son multiplataforma, pero no se verificó con evidencia real en este ADR.
