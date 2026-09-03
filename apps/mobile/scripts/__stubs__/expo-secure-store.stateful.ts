// Stub con estado en memoria de `expo-secure-store`, para gates que SÍ
// necesitan observar el ciclo guardar -> leer -> borrar (a diferencia del
// stub no-op de al lado). Node puro, sin `react-native`.
const store = new Map<string, string>();

export async function getItemAsync(key: string): Promise<string | null> {
  return store.has(key) ? (store.get(key) as string) : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  store.set(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  store.delete(key);
}

/** Helper de test -- no forma parte de la API real de expo-secure-store. */
export function __seed(key: string, value: string): void {
  store.set(key, value);
}

/** Helper de test -- expone el estado para aserciones. */
export function __dump(): Record<string, string> {
  return Object.fromEntries(store);
}
