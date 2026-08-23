# TESTER-DISTRIBUTION-1C Closure Report — Release / Standalone Android Foundation

**Fecha del reporte**: 2026-08-23
**Incremento**: TESTER-DISTRIBUTION-1C (de la serie TESTER-DISTRIBUTION, preparación de la primera APK de testers de ZETRYND)
**Documentos relacionados**: ninguno previo de esta serie existía; este es el primer documento de seguimiento/cierre de TESTER-DISTRIBUTION.

**Estado final**: **PASS** — validado físicamente por el Product Owner el 2026-08-23 (build real en su máquina + instalación + prueba standalone física, ver §3-§5).

## 1. Objetivo de 1C

Generar e instalar una APK **Release** standalone de ZETRYND capaz de arrancar y renderizar la aplicación **sin** Metro, sin USB, sin `adb reverse` y sin backend local — el paso previo obligatorio antes de conectar backend remoto (bloques posteriores).

## 2. Alcance — qué NO cubre 1C

Explícitamente fuera de alcance de este cierre, sin excepción:

- Backend remoto funcionando o desplegado.
- Firebase real/configurado para distribución.
- Anthropic conectado / Tutor IA funcional contra un proveedor real.
- APK lista para producción o para Google Play.
- Firma de release definitiva/de producción, keystore definitivo, AAB.
- Actualización automática / OTA / CI-CD de releases.

La firma de `release` sigue usando `signingConfigs.debug` — **temporal**, sin resolver, pendiente de una decisión consciente futura (ya señalada en el cierre de TESTER-DISTRIBUTION-1A/1B.2).

## 3. Evidencia física de PASS

Reportada por el Product Owner, ejecutada en su máquina (fuera del entorno de este agente, que tiene una limitación de sandbox conocida — ver §9):

```
.\gradlew.bat assembleRelease
BUILD SUCCESSFUL in 1m 30s
400 actionable tasks: 42 executed, 358 up-to-date
```
- `createBundleReleaseJsAndAssets`: PASS. Entry efectivo resuelto: `node_modules\expo-router\entry.js`. 1281 módulos empaquetados, `index.android.bundle` + sourcemap escritos, 27 assets copiados.
- Sin "Unable to resolve expo-router/entry.js".
- Sin fallo MAX_PATH/CMake/Ninja (`buildCMakeRelWithDebInfo[armeabi-v7a]`).

## 4. Ruta y estado del APK

```
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```
Instalada con `adb install -r` → `Success`.

## 5. Validación standalone física

Tras instalar: cable USB desconectado, Metro apagado, backend local apagado, sin `adb reverse`. Apertura desde el launcher del teléfono:

- Splash cargó (branding ZETRYND).
- Llegó correctamente a Auth/Login.
- Sin "Unable to load script".
- Sin "No routes found".
- Sin crash de Android.
- Intento de login → **"No se pudo conectar con el servidor"** — **esperado y correcto**: confirma que la app funciona de extremo a extremo hasta el punto de intentar hablar con un backend que todavía no existe/está desplegado. No es un defecto de 1C.

## 6. Problemas encontrados durante 1C, causa raíz y corrección final

### 6.1 — `Unable to resolve module .../node_modules/expo-router/entry.js` (bundling Release)

**Causa raíz**: en Windows, React Native Gradle Plugin (RNGP) relativiza `--entry-file` (y otros argumentos del comando de bundling) contra la propiedad `react.root` (`Os.kt: File.cliPath()`, solo en Windows). Metro, en cambio, siempre resuelve esa ruta relativa contra su propio *server root* de monorepo (`getMetroServerRoot`, detectado vía `pnpm-workspace.yaml`), que es siempre la raíz real del workspace pnpm — nunca `apps/mobile`. Con `root=apps/mobile`, ambas bases no coinciden y la resolución falla.

**Corrección final** (NO fue simplemente mover `root` a la raíz del monorepo — eso reintroducía el problema de §6.2): se mantiene `root = file(projectRoot)` (`apps/mobile`, correcto para que Expo CLI/Expo Router funcionen — ver §7) y se añade una **segunda ocurrencia** de `--entry-file` vía `extraPackagerArgs`, con un valor calculado dinámicamente usando `expo/scripts/resolveAppEntry` en su modo oficial **`relative`** (no `absolute`) — ese modo llama a `resolveRelativeEntryPoint` de `@expo/config`, que calcula la ruta ya relativa al *server root* real de Metro, exactamente lo que Metro espera recibir. El parser de `@expo/cli` procesa los argumentos en orden inverso y no sobrescribe una clave ya fijada, así que la última ocurrencia de `--entry-file` (la nuestra) prevalece sobre la que RNGP añade automáticamente — verificado antes de aplicar el cambio contra el módulo real e instalado de `@expo/cli`, y confirmado después por la evidencia física de build.

### 6.2 — `Error: No routes found` (crash runtime tras instalar la APK)

**Causa raíz**: Expo Router calcula su directorio de rutas como `EXPO_ROUTER_ABS_APP_ROOT = projectRoot + '/app'`, donde `projectRoot` es el mismo valor que Expo CLI resuelve del cwd del proceso de bundling (= `react.root`). Cuando, para resolver §6.1, se movió `root` a la raíz del monorepo, Expo Router buscaba rutas en `<raíz-monorepo>/app` (no existe) en vez de `apps/mobile/app` (el real) → cero rutas encontradas.

**Corrección final**: la misma que §6.1 — al volver a fijar `root=apps/mobile`, `EXPO_ROUTER_ABS_APP_ROOT` vuelve a calcularse correctamente como `apps/mobile/app` (verificado que ese directorio existe), sin necesitar ningún cambio adicional.

**Por qué la solución final evita A y B simultáneamente**: separa conceptualmente cuatro roles que antes se confundían en una sola propiedad de Gradle:

| Rol | Valor final |
|---|---|
| Expo project root (Expo CLI, `getConfig`, Auth/UI) | `apps/mobile` |
| Expo Router routes directory | `apps/mobile/app` |
| Metro server / workspace root (siempre, por diseño de Metro) | raíz real del workspace pnpm |
| `--entry-file` efectivo para Release | `node_modules/expo-router/entry.js` (relativo al workspace root) |

`root = file(projectRoot)` fija los dos primeros correctamente; la segunda ocurrencia de `--entry-file` (calculada dinámicamente, sin ninguna ruta absoluta hardcodeada de una máquina concreta) alinea el tercero y el cuarto sin tocar los dos primeros.

### 6.3 — `buildCMakeRelWithDebInfo[armeabi-v7a] FAILED` / `Filename longer than 260 characters`

**Causa raíz**: límite clásico de Windows (`MAX_PATH`, 260 caracteres). El generador CMake de una librería autolinked-codegen (`react_codegen_safeareacontext`) construye rutas de objeto que incrustan la ruta absoluta del proyecto **dos veces**, superando 260 caracteres incluso con una ubicación de repositorio muy corta (verificado matemáticamente: incluso con una base de 4 caracteres, la ruta resultante seguía por encima de 260).

**Corrección final** (requiere DOS partes, una del repo y una externa a él):
1. **Repo**: fijar explícitamente CMake **3.31.6** (ya presente en el SDK del Product Owner) en vez del 3.22.1 por defecto — su `ninja.exe` declara `longPathAware=true` en su manifiesto Win32 (verificado inspeccionando el binario directamente; el `ninja.exe` de 3.22.1 no lo declara).
2. **Externa al repo, en Windows**: `LongPathsEnabled=1` en el registro (`HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem`) — sin esto, el manifiesto `longPathAware` del ninja.exe de 3.31.6 no tiene efecto. **Esto NO es una configuración del repositorio** — es una configuración de la máquina de build, debe activarse en cualquier máquina física donde se genere un Release en Windows.

No se cambió NDK, ABIs ni New Architecture para resolver esto.

## 7. Configuración Android final relevante (`apps/mobile/android/app/build.gradle`)

| Propiedad | Valor final |
|---|---|
| `react.root` | `file(projectRoot)` → `apps/mobile` |
| `react.entryFile` | ruta absoluta vía `resolveAppEntry` modo `absolute` (sin cambios respecto al template original) |
| `react.extraPackagerArgs` | `["--entry-file", <resolveAppEntry modo relative>]` — sobrescribe el `--entry-file` automático de RNGP |
| `react.cliFile` | sin cambios (`require.resolve('@expo/cli', ...)`) |
| `react.bundleCommand` | `"export:embed"` (sin cambios) |
| `android.externalNativeBuild.cmake.version` | `"3.31.6"` |
| `namespace` / `applicationId` | `com.zetrynd.app` |
| `versionCode` | `1` |
| `versionName` | `"0.1.0"` |
| `buildTypes.release.signingConfig` | `signingConfigs.debug` — **temporal**, sin resolver |
| `gradle.properties: hermesEnabled` | `true` (sin cambios) |
| `gradle.properties: newArchEnabled` | `true` (sin cambios) |

## 8. Advertencia crítica — `apps/mobile/android/**` está gitignored

**Todas las correcciones nativas de 1C viven exclusivamente dentro del árbol `android/` generado**, que está excluido de git (`apps/mobile/.gitignore:41`, `/android`). Esto incluye:

- `react.root = file(projectRoot)`.
- `extraPackagerArgs` con el segundo `--entry-file` en modo relative.
- `android.externalNativeBuild.cmake.version = "3.31.6"`.
- Todo el trabajo de branding nativo de TESTER-DISTRIBUTION-1B.2 (package rename, iconos, splash).

**Riesgo concreto**: un futuro `expo prebuild` (con o sin `--clean`) **regeneraría `android/` desde cero a partir de `app.json`**, perdiendo silenciosamente las tres correcciones de 1C listadas arriba (ninguna tiene hoy un equivalente en `app.json`/config plugin). Si eso ocurriera, reaparecerían exactamente los mismos tres problemas de §6, en el mismo orden.

**Qué habría que reproducir manualmente después de un futuro prebuild** (si no se resuelve antes con un mecanismo persistente):
1. Re-aplicar `root = file(projectRoot)` + el bloque `extraPackagerArgs` con el `--entry-file` relative, en el nuevo `app/build.gradle` generado.
2. Re-aplicar `externalNativeBuild.cmake.version = "3.31.6"`.
3. Confirmar que `LongPathsEnabled=1` sigue activo en la máquina de build (configuración de SO, no se pierde con el prebuild, pero conviene re-verificarla).

**Mecanismo persistente/canónico recomendado para el futuro** (no implementado ahora, por instrucción explícita — no se introduce infraestructura nueva durante este cierre): un **Expo config plugin** propio (`apps/mobile/plugins/withAndroidMonorepoBundling.js` o similar, registrado en `app.json` → `"plugins"`) que, durante `expo prebuild`, modifique programáticamente el `android/app/build.gradle` generado para reinyectar `root`/`extraPackagerArgs`/`cmake.version` automáticamente — es el mecanismo oficial que Expo provee exactamente para este tipo de necesidad (parchear el resultado del prebuild de forma reproducible, sin editar `android/` a mano cada vez). Queda como recomendación para un incremento futuro, no de 1C.

## 9. Limitación del entorno de este agente

Ninguna verificación de build (`assembleRelease`, `createBundleReleaseJsAndAssets`) pudo ejecutarse dentro de este entorno de agente durante todo TESTER-DISTRIBUTION-1C — Gradle falla ahí con `java.io.IOException: Unable to establish loopback connection`, una restricción de red del sandbox de este agente, no del proyecto. Todas las correcciones de código se diagnosticaron y verificaron por lectura directa del código fuente instalado (RNGP, `@expo/cli`, `@expo/config`, `babel-preset-expo`) y con simulaciones/ejecuciones aisladas de Node de los mismos módulos reales (sin Gradle). La confirmación física final de BUILD SUCCESSFUL, instalación y funcionamiento standalone la realizó el Product Owner en su propia máquina.

## 10. Procedimiento reproducible de build (Windows, máquina física)

Prerrequisitos de la máquina (una sola vez, fuera del repo):
1. `LongPathsEnabled=1` en el registro de Windows (§6.3), con reinicio.
2. Android SDK con CMake 3.31.6 disponible (`C:\Android\Sdk\cmake\3.31.6\`).

Build:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
cd "C:\Users\usuario 4\Downloads\AXIOMA\app\apps\mobile\android"
.\gradlew.bat assembleRelease
```
Instalación:
```powershell
adb install -r ".\app\build\outputs\apk\release\app-release.apk"
```

## 11. Criterio de PASS (tal como se definió al abrir 1C)

> "ZETRYND abre y renderiza su aplicación sin Metro. El error de backend no es fallo de 1C."

Cumplido íntegramente, con evidencia física — ver §3-§5.

## 12. Próximo bloque lógico

Backend remoto (infraestructura, Postgres, migraciones, seed con TEST-CONTENT-1, `NODE_ENV=production`, `AUTH_IDENTITY_PROVIDER=firebase`) — precondición para que `EXPO_PUBLIC_API_BASE_URL` deje de apuntar a `localhost` y el error "No se pudo conectar con el servidor" deje de ser el resultado esperado. Firebase real y Anthropic quedan detrás de ese bloque, no de este.
