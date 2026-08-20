// Stub SOLO para `verify-continue-target-batch-gate.ts` -- ver el
// monkeypatch de `Module._resolveFilename` en ese script. `expo-secure-store`
// real termina requiriendo `react-native` (para `NativeModules`/`Platform`),
// que no se puede transformar/ejecutar fuera del runtime de Expo/Metro. Este
// gate corre en Node puro y nunca llega a necesitar persistencia real --
// `lib/auth/session-storage.ts` ya envuelve toda lectura/escritura en
// try/catch y trata cualquier fallo como "sin sesión persistida" (ver ese
// archivo), así que estos no-ops son indistinguibles, para este gate, de
// correr sin soporte de SecureStore.
export async function getItemAsync(): Promise<string | null> {
  return null;
}

export async function setItemAsync(): Promise<void> {}

export async function deleteItemAsync(): Promise<void> {}
