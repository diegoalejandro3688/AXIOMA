# ADR 0013 — Integración Mobile ↔ Backend (Bloque II, Vertical Slice M1)

- **Estado**: **Aprobada formalmente** — gate completo ejecutado y verificado (2026-08-02) en navegador real (Expo Web + Browser tool) contra el backend real, incluyendo los 4 Decision Gates cerrados en la propuesta y las 2 comprobaciones adicionales pedidas. Ver "Validación (resultado real)".
- **Fecha**: 2026-08-02
- **Fase de aplicación**: Fase 1 — Vertical Slice M1, Bloque II (Roadmap AXIOMA Phase 1 Kickoff, §7.2)
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — introduce autenticación real, una decisión de almacenamiento seguro, y el primer consumo real de contratos entre dominios desde un cliente.

## Contexto

El Phase 1 Kickoff define el Bloque II como: "Conectar la aplicación móvil con los servicios implementados en el backend, sustituyendo los elementos simulados utilizados durante la Fase 0", con resultado esperado "la aplicación consumirá información real desde la API, utilizando la infraestructura de autenticación y comunicación definitiva". Hoy `apps/mobile` tiene `MockAuthProvider` (auth en memoria, nunca sobrevive a un reinicio -- ADR-0009), tabs con `ComingSoonPlaceholder`, y ninguna llamada de red real. Bloque I (ADR-0012) ya dejó endpoints reales de EDUCATION; ADR-0008 ya dejó `GET/PATCH /user/profile`; ADR-0004 ya dejó `POST /auth/session`/`GET /auth/me`/`POST /auth/logout`.

La propuesta inicial de este bloque detectó 4 Decision Gates que se cierran en este ADR (ver "Decisión").

## Decisión

### 1. Fórmulas: ADR-0002 no se reabre, se corrige la coherencia (ver ADR-0012, "Enmienda")

`formulaBlockSchema` ahora exige `svg` junto a `latex`. Infraestructura mínima agregada en el backend (`renderLatexToSvg()`, `mathjax-full`) -- no un pipeline editorial. El cliente móvil **nunca interpreta LaTeX**: renderiza el `svg` recibido con `SvgXml` de `react-native-svg`, exactamente la arquitectura validada en ADR-0002.

### 2. Almacenamiento seguro: `expo-secure-store`

Aprobado explícitamente pese a reducir la facilidad de pruebas en Web (`expo-secure-store` no tiene soporte oficial en el target Web de Expo). `lib/auth/session-storage.ts` envuelve `getItemAsync`/`setItemAsync`/`deleteItemAsync` en `try/catch` -- un fallo de lectura/escritura (incluida la ausencia de soporte en Web) nunca lanza ni bloquea el arranque, cae al estado seguro `unauthenticated` (mismo criterio que `lib/storage/local-flags.ts`, ADR-0009 ajuste 5). En Web, esto significa en la práctica que la sesión no persiste entre recargas -- limitación conocida y aceptada, documentada aquí, no oculta.

### 3. Firebase real: diferido con el mismo criterio que Firebase Admin y Cloudflare R2

Toda la integración se implementa y valida contra `AUTH_IDENTITY_PROVIDER=stub` (backend) y su contraparte cliente. **No se construye un segundo camino de autenticación**: se define una interfaz `IdentityClient` (`lib/auth/identity-client.ts`) con dos implementaciones:

- `StubIdentityClient` -- genera tokens en el mismo formato que `StubIdentityProvider.encode()` del backend (`stub:` + base64url(JSON)), determinístico por email (mismo email → mismo `providerSubject` → misma cuenta al reutilizar sesión). Sin red, sin estado de servidor.
- `FirebaseIdentityClient` -- SDK real (`firebase/auth`, API modular: `initializeApp`, `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signOut`), construido de forma perezosa (nunca instanciado si no se selecciona), y que lanza un error de configuración explícito si faltan las variables `EXPO_PUBLIC_FIREBASE_*` -- nunca fallback silencioso a stub.

`EXPO_PUBLIC_AUTH_IDENTITY_CLIENT` (`stub` por defecto) selecciona la implementación, en el mismo espíritu que `AUTH_IDENTITY_PROVIDER` del backend. Cuando exista un proyecto Firebase real, activar el flujo real es un cambio de configuración (variables de entorno), no de código -- igual que ADR-0004 (Firebase Admin) y ADR-0010 (Cloudflare R2, todavía sin aprovisionar).

### 4. Resolución de imágenes: cerrado en Bloque I (ver ADR-0012, "Enmienda")

`EducationService` resuelve `objectKey` a `url` firmada antes de responder. El cliente móvil solo conoce `imageBlockResponseSchema` (`url`, `altText`) -- nunca `objectKey`. Confirmado por gate: la respuesta cruda de ningún endpoint de EDUCATION contiene la cadena `"objectKey"`.

### Arquitectura del lado del cliente

- **`AuthProvider`** (`lib/auth/auth-provider.tsx`, reemplaza `MockAuthProvider`) -- mismo contrato de estados (`loading|unauthenticated|authenticated`) exigido por ADR-0009, así que `app/_layout.tsx`/`Stack.Protected` no cambian. Internamente usa el `IdentityClient` seleccionado + `POST /auth/session`.
  - **Restauración de sesión al abrir la app**: en el primer render, intenta leer `idToken`/`sessionId` de `session-storage`; si existen, llama `GET /auth/me`. `200` → `authenticated`; ausencia de sesión guardada, error de red, o `401` → `unauthenticated` (ver punto de gate 5 más abajo -- el caso `401` limpia además las credenciales persistidas).
  - **`login(email, password)`** / **`register(email, password)`**: `identityClient` → `idToken` → `POST /auth/session` → persistir → `authenticated`.
  - **`logout()`**: `POST /auth/logout` (best-effort -- un fallo de red no bloquea el logout local), limpia `session-storage`, `unauthenticated` incondicionalmente.
  - **Manejador global de 401**: el cliente de API invoca un callback registrado por `AuthProvider` ante cualquier `401` de cualquier endpoint autenticado (no solo `/auth/me`) -- limpia sesión y transiciona a `unauthenticated` desde cualquier pantalla, no solo al abrir la app.
- **`lib/api/client.ts`** -- `apiRequest()`: adjunta `Authorization`/`X-Session-Id` desde `session-storage` en cada llamada, distingue error de red (`kind: 'network'`, sin `fetch` completado) de error HTTP (`kind: 'http'`, con `status`/`code`/`message` del envelope `{error:{code,message}}` ya usado por el backend), sin librería nueva.
- **`lib/api/education.ts`** / **`lib/api/user.ts`** -- funciones tipadas sobre `@axioma/contracts`, response parseada con los esquemas Zod ya existentes (defensa en profundidad también en el cliente).
- **Estados de interfaz** (`components/loading-state.tsx`, `error-state.tsx` con reintento, `empty-state.tsx`) -- subconjunto de Master Context §4.15 relevante para un recorrido de solo lectura: Carga, Contenido disponible, Vacío, Error recuperable. El protocolo completo de §4.16 (sincronización pendiente, reconciliación) queda diferido -- no hay todavía nada que sincronizar de vuelta al servidor (eso empieza en Bloque III).
- **Estudio conectado** (`app/(tabs)/estudio/`) -- lista de temas de la materia sembrada → detalle de tema (recurso publicado + preguntas publicadas, ambos de solo lectura). No incluye responder preguntas ni recibir retroalimentación evaluada -- no existe endpoint de envío de respuesta hasta Bloque III/IV, y `isCorrect` nunca llega al cliente (ADR-0012) para que pudiera evaluarse localmente aunque se quisiera.
- **Perfil conectado** (`app/(tabs)/perfil.tsx`) -- `GET /user/profile` (inicializa vía `POST` si `404`, ver ADR-0008), edición vía `PATCH`, logout real.

## Alternativas descartadas

- **Reabrir ADR-0002 para simplificar a solo-LaTeX** -- descartado explícitamente por el usuario.
- **KaTeX vía WebView como vía primaria para M1** -- descartado: contradiría ADR-0002 sin una decisión explícita que lo reabra.
- **`AsyncStorage` para el token/sesión** -- descartado: información sensible, ADR-0009 ya lo reservaba solo para datos no sensibles.
- **Bloquear Bloque II hasta tener un proyecto Firebase real** -- descartado explícitamente por el usuario; mismo criterio ya usado con Firebase Admin (ADR-0004) y Cloudflare R2 (ADR-0010).
- **`react-query`/`axios`** -- descartado por ahora: `fetch` nativo + un wrapper delgado alcanza para el volumen de llamadas de M1; se reevalúa si la complejidad de caché/reintentos lo justifica.
- **Permitir responder preguntas localmente usando la respuesta ya cargada** -- descartado: `isCorrect` nunca llega al cliente (invariante de ADR-0012); simularlo sin backend real sería exactamente el tipo de elemento simulado que este bloque existe para eliminar.

## Consecuencias

- Cualquier pantalla nueva que llame a un endpoint autenticado se beneficia automáticamente del manejador global de `401` -- no necesita manejar esa transición por separado.
- Cuando exista un proyecto Firebase real, activar `FirebaseIdentityClient` es una decisión operativa (variables de entorno), pendiente y no bloqueante -- igual que R2.
- En Web, la sesión no persiste entre recargas (limitación de `expo-secure-store`) -- aceptado explícitamente; no se construye un mecanismo paralelo solo para Web.
- **CORS habilitado en el backend** (`app.enableCors()`, `src/main.ts`) -- necesario para que el target Web (usado para verificación, ver ADR-0009) pueda llamar a la API desde un origen distinto. Sin `allowedHeaders` explícito: `cors` refleja los headers que pide cada preflight, cubre `x-session-id`/`authorization` sin enumerarlos. No afecta a nativo (iOS/Android no tiene restricción CORS).
- Estudio queda listo para que Bloque III agregue registro de progreso y envío de respuestas sin rediseñar la navegación -- la estructura `estudio/[topicId]` ya separa lista de detalle.
- Cualquier fórmula nueva sembrada en el futuro debe generarse con `renderLatexToSvg()` (o su sucesor del pipeline editorial) -- nunca persistir `latex` sin `svg` junto a él.

## Hallazgo durante la implementación: `expo-secure-store` en Web no persiste NADA, ni en memoria durante la misma ejecución

La propuesta asumía que en Web solo se perdía la sesión **entre recargas**. Verificado empíricamente (Browser tool, `localStorage` inspeccionado directamente): `expo-secure-store` en Web no lanza, pero tampoco escribe en ningún backend real (no usa `localStorage` ni ningún otro almacenamiento) -- sin mitigación, la app perdía la sesión en la llamada **inmediatamente siguiente** al login (`GET /education/subjects` → `401` → el propio manejador global de 401 volvía a Login), no solo tras un reinicio.

**Corrección**: `session-storage.ts` agrega una caché en memoria (`cachedSession`) como fuente de verdad para `loadSession()`/`saveSession()`/`clearSession()` durante la ejecución en curso; `SecureStore` sigue siendo la persistencia real entre reinicios donde tiene soporte (nativo). El comportamiento documentado en "Consecuencias" (sesión no sobrevive a una recarga en Web) sigue siendo correcto -- lo que se corrigió es que ahora sí sobrevive **dentro** de la misma ejecución, que es indispensable para que la app funcione en absoluto en ese target.

## Validación (resultado real, 2026-08-02)

Ejecutado en navegador real (`expo start --web` + Browser tool) contra el backend real (Postgres + MinIO vía Docker), con y sin conectividad:

- Login real (stub, `estudiante-e2e@example.com`) → `POST /auth/session` real (200) → Estudio con datos reales de punta a punta: `GET /education/subjects` → `.../topics` → `.../resource` → `.../questions`, todos `200`, contenido idéntico al servido por el backend (materia "Matemática", unidad "Porcentajes y proporcionalidad", 2 preguntas con 4 alternativas cada una) -- sin ningún dato simulado ni hardcodeado.
- Perfil: `GET` → `404` (sin inicializar) → formulario → `POST` → `201`, perfil real con `timezone: America/Santiago` visible.
- **Logout real revoca la sesión en el backend** -- verificado directamente en Postgres: `auth_session.revoked_at` pasa de `NULL` a poblado inmediatamente tras pulsar "Cerrar sesión", y la UI vuelve a Login.
- **`GET /auth/me` → `401` limpia credenciales de inmediato**: sesión revocada manualmente en Postgres (simulando expiración/revocación real) mientras la app seguía "autenticada" en el cliente; al navegar a Estudio (dispara una llamada autenticada), la respuesta `401` activó el manejador global y la app volvió a Login sin intervención manual adicional.
- **Sin conectividad → error recuperable → reintento exitoso**: backend detenido → navegar a Estudio → `ErrorState` ("No se pudo conectar con el servidor. Revisa tu conexión.") con botón "Reintentar", sin pantalla en blanco ni crash → backend restaurado → "Reintentar" → `200` con los mismos datos reales, sin recargar la página.
- `pnpm -r run typecheck/lint` (4 paquetes): verde. Build de `contracts`/`backend`: verde. `expo export --platform android`: verde (dos veces, incluida la corrida final tras el fix de `session-storage.ts`).
- Gate de EDUCATION (32 comprobaciones) re-ejecutado contra el backend con CORS habilitado: verde, sin regresión.
- Gate de USER (40 comprobaciones) re-ejecutado en una instancia limpia: verde, sin regresión.
- Gate de OFFLINE-OUTBOX (24 comprobaciones, `node:sqlite`): verde, sin regresión -- Bloque II no tocó `lib/offline/`.
- Ningún import de `MockAuthProvider` ni dato hardcodeado de Estudio/Perfil remanente (`lib/auth/mock-auth-provider.tsx` eliminado del repositorio).

---

**Bloque II -- Integración Mobile ↔ Backend: implementado, validado y cerrado (2026-08-02).**
