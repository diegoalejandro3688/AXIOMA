import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Cache local del intento ACTIVE por ensayo -- ENSAYOS-M1-C.
 *
 * SOLO conveniencia de UX (ADR-0024 §16): permite que la pantalla de intro
 * distinga "Comenzar" de "Continuar" sin llamar a `POST /attempts` (que
 * CREARÍA un intento con solo verlo). El backend sigue siendo la única
 * autoridad: la intro valida el id guardado con `GET /exams/me/attempts/:id`
 * y lo descarta si ya no está ACTIVE. Estado NO sensible -> `AsyncStorage`
 * (mismo criterio que `lib/storage/local-flags.ts`), nunca `secure-store`.
 *
 * Clave versionada (`axioma.v1.*`). NO es una cola offline: no persiste
 * respuestas, no reintenta nada -- solo un id.
 */
const KEY = 'axioma.v1.exam.activeAttemptByExam';

type Map = Record<string, string>;

async function readAll(): Promise<Map> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed as Map;
    return {};
  } catch {
    return {};
  }
}

async function writeAll(map: Map): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // Fallo de escritura -- degradar en silencio: sin cache, la intro solo
    // ofrecerá "Comenzar ensayo" (el backend reanuda igual al pulsarlo).
  }
}

export async function rememberActiveAttempt(examId: string, attemptId: string): Promise<void> {
  const map = await readAll();
  await writeAll({ ...map, [examId]: attemptId });
}

export async function getRememberedAttempt(examId: string): Promise<string | null> {
  const map = await readAll();
  return map[examId] ?? null;
}

export async function forgetActiveAttempt(examId: string): Promise<void> {
  const map = await readAll();
  if (!(examId in map)) return;
  const rest = { ...map };
  delete rest[examId];
  await writeAll(rest);
}
