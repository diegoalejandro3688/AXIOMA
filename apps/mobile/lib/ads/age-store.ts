import * as SecureStore from 'expo-secure-store';
import { ageEligibilityKey, parseStoredAgeEligibility, type AgeEligibility, type AgeEligibilityInput } from './age-eligibility';

/**
 * ADS V1 -- PRE-PLAY. Persistencia LOCAL de la elegibilidad por edad.
 *
 * Guarda UNICAMENTE la etiqueta derivada (`under18` | `adult18plus`), por cuenta,
 * en `expo-secure-store` (Keystore en Android) -- la fecha de nacimiento nunca llega
 * aqui. Sin red, sin backend, sin registros. Cualquier fallo de lectura se trata
 * como `unknown` (fail-closed: sin anuncios); un fallo de escritura no bloquea nada
 * (la respuesta rige en memoria durante la sesion y se volveria a preguntar despues).
 */
export async function readAgeEligibility(accountId: string): Promise<AgeEligibilityInput> {
  try {
    return parseStoredAgeEligibility(await SecureStore.getItemAsync(ageEligibilityKey(accountId)));
  } catch {
    return 'unknown';
  }
}

export async function writeAgeEligibility(accountId: string, eligibility: AgeEligibility): Promise<void> {
  try {
    await SecureStore.setItemAsync(ageEligibilityKey(accountId), eligibility);
  } catch {
    // Sin persistencia: solo vale para esta ejecucion.
  }
}
