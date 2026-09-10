const { getDefaultConfig } = require('expo/metro-config');

// Expo SDK 54's `getDefaultConfig` ya detecta la raiz del monorepo y fija
// `server.unstable_serverRoot` a la raiz del workspace
// (C:\...\AXIOMA\app) -- de ahi resuelve el node_modules hoisted
// (`expo-router/entry`) y `@axioma/contracts` (packages/contracts). Un
// override manual a `__dirname` (apps/mobile) rompia esa resolucion en
// Windows: el entry virtual de expo-router buscaba
// `apps/mobile/node_modules/expo-router/entry` (inexistente con
// node-linker=hoisted) -> Metro 404. Sin customizacion: el default es correcto.
const config = getDefaultConfig(__dirname);

module.exports = config;
