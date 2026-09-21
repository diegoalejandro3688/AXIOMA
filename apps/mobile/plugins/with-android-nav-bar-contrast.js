/* eslint-disable @typescript-eslint/no-require-imports -- config plugin de Expo: CommonJS puro es la convención obligatoria del ecosistema (evaluado por Node fuera del pipeline TS/ESM), mismo criterio que metro.config.js. */
const { withAndroidStyles, AndroidConfig } = require('@expo/config-plugins');

/**
 * vc3 (F02, Android Navigation Bar) -- fija `android:enforceNavigationBarContrast="false"`
 * en el `AppTheme` para eliminar el scrim gris que Android superpone
 * automáticamente sobre la navigation bar transparente cuando edge-to-edge
 * está activo (`gradle.properties: edgeToEdgeEnabled=true`).
 *
 * apps/mobile/android/ está en .gitignore -- se regenera en cada
 * `expo prebuild` (nunca trackeado, nunca commiteado). Editar
 * `styles.xml` directamente no sobreviviría al siguiente prebuild; este
 * config plugin es el mecanismo declarativo y REPRODUCIBLE soportado por
 * Expo para aplicar exactamente esa transformación en cada generación.
 *
 * ÚNICO efecto: ese atributo de tema. NO toca edge-to-edge, NO oculta la
 * navigation bar (sin immersive/fullscreen), NO afecta la visibilidad ni
 * funcionalidad de Back/Home/Recents -- solo el scrim de contraste
 * forzado que Android superpone sobre lo que la app ya pinta ahí.
 */
function withAndroidNavBarContrast(config) {
  return withAndroidStyles(config, (config) => {
    config.modResults = AndroidConfig.Styles.setStylesItem({
      xml: config.modResults,
      parent: AndroidConfig.Styles.getAppThemeGroup(),
      item: AndroidConfig.Resources.buildResourceItem({
        name: 'android:enforceNavigationBarContrast',
        value: 'false',
        targetApi: '29',
      }),
    });
    return config;
  });
}

module.exports = withAndroidNavBarContrast;
