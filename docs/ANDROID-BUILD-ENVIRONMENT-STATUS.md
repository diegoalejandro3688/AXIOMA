# Estado del entorno de build Android — AXIOMA

**Última actualización:** 2026-08-09
**Estado:** 🟢 Funcional. Build exitoso, APK instalado y verificado en dispositivo físico, login end-to-end confirmado.

Este documento fue actualizado con pasos ejecutados fuera del contexto de la sesión asistida (verificados y reportados por el desarrollador). Se documentan como hechos confirmados, no observados directamente por el asistente.

## 1. Causa del fallo de compilación original

Al compilar el proyecto nativo Android (`apps/mobile/android`), el enlazador (`ld.lld`) fallaba con símbolos de C++ estándar indefinidos (`operator new`, `operator delete`, `std::__ndk1::basic_string::~basic_string`, etc.) en **tres módulos CMake independientes**:

- `:app:buildCMakeDebug`
- `:expo-modules-core:buildCMakeDebug`
- `:react-native-screens:buildCMakeDebug`

Confirmado en las 4 ABIs (`armeabi-v7a`, `arm64-v8a`, `x86`, `x86_64`) — no era un problema específico de una arquitectura.

**Diagnóstico técnico:** `CMAKE_CXX_IMPLICIT_LINK_LIBRARIES` (generado por CMake) no incluía `c++`, a pesar de que `ANDROID_STL=c++_shared` estaba correctamente declarado en los tres módulos. Esto ocurría igual con CMake 3.22.1 y con CMake 3.31.6, por lo que se descartó que fuera un bug de versión de CMake.

**Causa raíz: no aislada al 100%.** El build finalmente funcionó después de dos cambios combinados — (a) restaurar un baseline limpio sin parches experimentales y (b) trasladar el Android SDK a una ruta sin espacios (`C:\Android\Sdk`) y reconfigurar Android Studio/`local.properties`/`ANDROID_HOME` en consecuencia. **No se aisló cuál de los dos factores fue el determinante**, ni se descartó que ambos fueran necesarios en conjunto. En particular, **no se debe afirmar que el espacio en la ruta del SDK (`C:\Users\usuario 4\...`) fue por sí solo la causa demostrada** — es la explicación más probable dado el orden de los cambios, pero no quedó verificada de forma aislada (no se revirtió el traslado del SDK para confirmar que el build volvía a fallar).

**Lo que sí se descartó con evidencia directa:**
- Ruta con espacio en el nombre de usuario de Windows por su efecto en la invocación de `clang++.exe` — descartado, el compilador se invocaba correctamente.
- Rutas largas de pnpm/`.pnpm` — era un problema real y distinto (`CreateProcess error=2`), ya resuelto con `node-linker=hoisted` en `.npmrc`, pero no era la causa del error de `libc++`.
- Versión de CMake (3.22.1 vs 3.31.6) — descartado con evidencia directa (el mismo fallo ocurría con ambas versiones).

## 2. Parches experimentales — revertidos, no forman parte de la solución final

Se probaron y luego **revertieron completamente** antes del build exitoso (no son parte de la configuración final funcional):
- `version "3.31.6"` forzado en `externalNativeBuild.cmake` de `apps/mobile/android/app/build.gradle`, `node_modules/expo-modules-core/android/build.gradle`, `node_modules/react-native-screens/android/build.gradle`.
- `c++_shared` agregado explícitamente a `target_link_libraries` en `node_modules/expo-modules-core/android/CMakeLists.txt` y `src/fabric/CMakeLists.txt`.

Ninguno de estos parches forma parte de la causa del build exitoso — el build funcionó **después** de revertirlos todos a su estado publicado original.

## 3. Cambio de ubicación del SDK — ejecutado y verificado

- El SDK fue **copiado** (no movido) a `C:\Android\Sdk`. La copia original en `C:\Users\usuario 4\AppData\Local\Android\Sdk` **se conserva temporalmente como respaldo**.
- Android Studio fue reconfigurado para usar `C:\Android\Sdk`; la advertencia de espacio en la ruta ("whitespace") desapareció.
- `apps/mobile/android/local.properties` quedó con:
  ```
  sdk.dir=C\:\\Android\\Sdk
  ```
- Variable de entorno `ANDROID_HOME=C:\Android\Sdk` creada.
- `%ANDROID_HOME%\platform-tools` añadido al `PATH`.
- `where.exe adb` confirma resolución correcta: `C:\Android\Sdk\platform-tools\adb.exe`.

## 4. Resultado del build

- **Gradle Sync:** SUCCESS.
- **Build APK:** `BUILD SUCCESSFUL in 11m 14s` — 271 tareas accionables (85 ejecutadas, 186 up-to-date).
- `app-debug.apk` generado e **instalado en un teléfono Android físico** vía ADB.
- El APK debug **arrancó correctamente** y cargó el bundle mediante Metro.

## 5. Conectividad verificada (Metro + backend)

```
adb reverse tcp:8081 tcp:8081   # Metro bundler
adb reverse tcp:3000 tcp:3000   # Backend
```

- Ambos túneles verificados activos con `adb reverse --list`.
- Backend local en el puerto 3000 verificado funcionando.
- `apps/mobile/.env`:
  ```
  EXPO_PUBLIC_API_BASE_URL=http://localhost:3000
  ```
- Tras reiniciar Metro, se verificó **login exitoso** desde AXIOMA instalada en el teléfono físico, conectando correctamente al backend local a través de los túneles `adb reverse`.

## 6. Estado real del entorno (verificado)

| Componente | Estado |
|---|---|
| Android SDK activo | `C:\Android\Sdk` (copia original en `C:\Users\usuario 4\AppData\Local\Android\Sdk` conservada como respaldo temporal) |
| `ANDROID_HOME` | `C:\Android\Sdk` |
| `local.properties` | `sdk.dir=C\:\\Android\\Sdk` |
| PATH | Incluye `%ANDROID_HOME%\platform-tools` |
| `adb` resuelto | `C:\Android\Sdk\platform-tools\adb.exe` (confirmado con `where.exe adb`) |
| NDK instalado | `27.1.12297006` |
| CMake instalado | `3.22.1` y `3.31.6` presentes; sin override activo (configuración por defecto del proyecto) |
| Gradle Sync | SUCCESS |
| Build APK | SUCCESSFUL (11m 14s) |
| APK instalado y arrancado en dispositivo físico | Sí, verificado |
| Metro bundler | Verificado, con `adb reverse tcp:8081` activo |
| Backend (puerto 3000) | Verificado funcionando, con `adb reverse tcp:3000` activo |
| Login end-to-end en dispositivo físico | **Verificado exitoso** |

## 7. TODO para la próxima sesión

El entorno Android local **ya está funcional** — ya no corresponde mover el SDK ni depurar el build. Pendientes de limpieza/seguimiento:

1. Decidir si eliminar la copia de respaldo del SDK en `C:\Users\usuario 4\AppData\Local\Android\Sdk` una vez confirmada la estabilidad de `C:\Android\Sdk` en el tiempo (liberar espacio en disco).
2. Si se desea aislar la causa raíz exacta del fallo original (opcional, no bloqueante): reproducir el fallo revirtiendo temporalmente a la ruta del SDK con espacio, manteniendo el resto del baseline limpio, para confirmar si el espacio en la ruta era per se el factor determinante.
3. Continuar el desarrollo normal de AXIOMA sobre este entorno ya verificado.
