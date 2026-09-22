/* eslint-disable @typescript-eslint/no-require-imports -- config plugin de Expo: CommonJS puro es la convención obligatoria del ecosistema (evaluado por Node fuera del pipeline TS/ESM), mismo criterio que with-android-nav-bar-contrast.js / metro.config.js. */
const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Release signing reproducibility -- `apps/mobile/android/` está en
 * .gitignore y se regenera desde cero en cada `expo prebuild`. Sin este
 * plugin, `buildTypes.release.signingConfig` vuelve SIEMPRE a
 * `signingConfigs.debug` (el default de la plantilla Expo/RNGP) -- ver
 * `docs/adr/TESTER-DISTRIBUTION-1C-CLOSURE-REPORT.md` §7-8, que documenta
 * exactamente este problema como "temporal, sin resolver". Este plugin lo
 * resuelve de forma DECLARATIVA y REPRODUCIBLE, mismo criterio que
 * `with-android-nav-bar-contrast.js`.
 *
 * ÚNICO efecto:
 *   A. agrega `signingConfigs.release`, leyendo la upload key EXCLUSIVAMENTE
 *      de las propiedades Gradle `ZETRYND_UPLOAD_*` -- nunca hardcoded, y
 *      `project.hasProperty(...)` como guardia: si esas propiedades no
 *      están configuradas (cualquier build que no sea de release real, p.
 *      ej. este mismo repo en una máquina sin la upload key), el bloque
 *      queda vacío y Gradle no falla.
 *   B. cambia SOLO `buildTypes.release.signingConfig` de
 *      `signingConfigs.debug` a `signingConfigs.release`.
 * `buildTypes.debug` NUNCA se toca.
 *
 * Opera sobre el TEXTO Groovy vía `withAppBuildGradle` (no hay AST Groovy
 * en `@expo/config-plugins`, mismo mecanismo que usa RNGP/Expo para sus
 * propios mods de `build.gradle`). Ancla en el bloque `debug { ... }`
 * DEFAULT exacto que genera la plantilla Expo/RNGP -- si esa forma exacta
 * no aparece (plantilla cambiada en una futura versión de Expo/RN), el
 * prebuild FALLA explícitamente en vez de dejar el archivo a medio
 * transformar o silenciosamente sin firmar.
 *
 * IDEMPOTENTE: si el archivo ya contiene `ZETRYND_UPLOAD_STORE_FILE`
 * (ya transformado), no vuelve a insertar el bloque ni a tocar
 * `buildTypes.release` -- una segunda ejecución es un no-op seguro.
 */
const DEBUG_SIGNING_CONFIG_BLOCK = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;

const RELEASE_SIGNING_CONFIG_BLOCK = `    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (project.hasProperty('ZETRYND_UPLOAD_STORE_FILE')) {
                storeFile file(ZETRYND_UPLOAD_STORE_FILE)
                storePassword ZETRYND_UPLOAD_STORE_PASSWORD
                keyAlias ZETRYND_UPLOAD_KEY_ALIAS
                keyPassword ZETRYND_UPLOAD_KEY_PASSWORD
            }
        }
    }`;

// Ancla en el comentario que RNGP/Expo SIEMPRE emite dentro de
// `buildTypes.release` (nunca dentro de `buildTypes.debug`) -- así el
// reemplazo es específico a release sin tocar la línea idéntica de debug.
const RELEASE_BUILD_TYPE_SIGNING_LINE =
  `            // Caution! In production, you need to generate your own keystore file.\n` +
  `            // see https://reactnative.dev/docs/signed-apk-android.\n` +
  `            signingConfig signingConfigs.debug`;

const RELEASE_BUILD_TYPE_SIGNING_LINE_PATCHED =
  `            // Caution! In production, you need to generate your own keystore file.\n` +
  `            // see https://reactnative.dev/docs/signed-apk-android.\n` +
  `            signingConfig signingConfigs.release`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    const alreadyPatched = contents.includes('ZETRYND_UPLOAD_STORE_FILE');

    if (alreadyPatched) {
      // Idempotente: ya transformado (p. ej. una segunda invocación del
      // plugin sobre el mismo archivo) -- no-op seguro.
      return config;
    }

    if (!contents.includes(DEBUG_SIGNING_CONFIG_BLOCK)) {
      throw new Error(
        'with-android-release-signing: el bloque signingConfigs.debug esperado no se encontró en build.gradle -- ' +
          'la plantilla Expo/RNGP pudo haber cambiado. Fallando explícitamente en vez de dejar release sin firmar correctamente.',
      );
    }
    if (!contents.includes(RELEASE_BUILD_TYPE_SIGNING_LINE)) {
      throw new Error(
        'with-android-release-signing: el bloque buildTypes.release esperado no se encontró en build.gradle -- ' +
          'la plantilla Expo/RNGP pudo haber cambiado. Fallando explícitamente en vez de dejar release sin firmar correctamente.',
      );
    }

    let next = contents.replace(DEBUG_SIGNING_CONFIG_BLOCK, RELEASE_SIGNING_CONFIG_BLOCK);
    next = next.replace(RELEASE_BUILD_TYPE_SIGNING_LINE, RELEASE_BUILD_TYPE_SIGNING_LINE_PATCHED);

    config.modResults.contents = next;
    return config;
  });
}

module.exports = withAndroidReleaseSigning;
