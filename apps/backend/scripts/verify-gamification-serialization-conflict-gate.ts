// Gate focalizado -- corrección de `hallazgo-latente` (LEF Bloque VIII, DG-14):
// el predicado de reintento de `XpGrantService.runSerializable` y
// `LeaguePointGrantService.runSerializable` reconocía únicamente `P2034`
// (conflicto de serialización detectado en sentencia intermedia) y dejaba
// escapar sin reintentar el conflicto detectado por Postgres en el `COMMIT`
// (`DriverAdapterError`/`TransactionWriteConflict`, SQLSTATE 40001) -- mismo
// hallazgo ya corregido en `ai-conversation.service.ts` (commit 29088e7,
// LEF Bloque VI Fase B).
//
// Este gate NO requiere backend levantado ni Postgres real: ejercita el
// predicado puro (`isSerializationConflict`) con errores sintéticos, y el
// bucle de reintento real (`runSerializable`, método privado, invocado vía
// cast a `any` -- mismo criterio que cualquier prueba de caja blanca de un
// detalle interno) con un `TransactionRunnerService` falso que lanza una
// secuencia de errores controlada, sin tocar la base de datos.
//
// Complementa (no sustituye) a `verify-gamification-xp-grant-gate.ts` y
// `verify-league-season-foundation-gate.ts`, que verifican el flujo real
// contra Postgres pero no fuerzan específicamente la rama "conflicto
// detectado en COMMIT" (estadísticamente rara de provocar bajo demanda).
//
// Uso: tsx scripts/verify-gamification-serialization-conflict-gate.ts
import { Prisma } from '../src/generated/prisma/client';
import { XpGrantService, isSerializationConflict as xpIsSerializationConflict } from '../src/gamification/xp-grant.service';
import { LeaguePointGrantService, isSerializationConflict as leagueIsSerializationConflict } from '../src/gamification/league-point-grant.service';

let failures = 0;
function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  OK  ${label}`);
  } else {
    console.error(`FALLO  ${label}${detail ? ` -- ${detail}` : ''}`);
    failures++;
  }
}

// ---------------------------------------------------------------------------
// Fixtures de error sintéticos -- misma forma exacta que las que produce
// Prisma 7 + @prisma/adapter-pg en cada caso real.
// ---------------------------------------------------------------------------

function makeP2034(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Transaction failed due to a write conflict or a deadlock', {
    code: 'P2034',
    clientVersion: 'test',
  });
}

/** Forma estructural real de un DriverAdapterError sin traducir, conflicto detectado en el COMMIT. */
function makeDriverAdapterCommitConflict(): unknown {
  return {
    name: 'DriverAdapterError',
    message: 'Driver adapter error',
    cause: { kind: 'TransactionWriteConflict' },
  };
}

/** Misma forma, pero solo con el SQLSTATE crudo preservado (rama alternativa del mapeo real). */
function makeDriverAdapterRawSqlstate(): unknown {
  return {
    name: 'DriverAdapterError',
    message: 'Driver adapter error',
    cause: { kind: 'postgres', code: '40001' },
  };
}

function makeUnrelatedError(): Error {
  return new Error('ECONNRESET -- fallo de red no relacionado');
}

function makeP2002(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'test' });
}

// ---------------------------------------------------------------------------
// Parte 1 -- el predicado puro, en ambos servicios, con las mismas 5 formas.
// ---------------------------------------------------------------------------

function checkPredicate(label: string, fn: (error: unknown) => boolean) {
  check(`${label}: P2034 (sentencia intermedia) -> true`, fn(makeP2034()) === true);
  check(`${label}: DriverAdapterError kind=TransactionWriteConflict (COMMIT) -> true`, fn(makeDriverAdapterCommitConflict()) === true);
  check(`${label}: DriverAdapterError kind=postgres code=40001 (COMMIT, forma alterna) -> true`, fn(makeDriverAdapterRawSqlstate()) === true);
  check(`${label}: error de red no relacionado -> false`, fn(makeUnrelatedError()) === false);
  check(`${label}: P2002 (violación de unicidad, otra familia) -> false`, fn(makeP2002()) === false);
}

// ---------------------------------------------------------------------------
// Parte 2 -- el bucle de reintento real (runSerializable), con un
// TransactionRunnerService falso que reproduce cada escenario.
// ---------------------------------------------------------------------------

class FakeTxRunner {
  private calls = 0;
  public sleepCalls = 0;
  constructor(private readonly script: Array<'p2034' | 'commit-conflict' | 'unrelated' | 'ok'>) {}

  async run<T>(fn: (tx: unknown) => Promise<T>): Promise<T> {
    const step = this.script[this.calls] ?? 'ok';
    this.calls++;
    if (step === 'p2034') throw makeP2034();
    if (step === 'commit-conflict') throw makeDriverAdapterCommitConflict();
    if (step === 'unrelated') throw makeUnrelatedError();
    return fn(undefined as never);
  }

  get attempts() {
    return this.calls;
  }
}

function makeServiceWithFakeRunner<TService>(
  Ctor: new (...args: unknown[]) => TService,
  runner: FakeTxRunner,
  extraArgCount: number,
): TService {
  const extraArgs = Array.from({ length: extraArgCount }, () => undefined);
  return new Ctor(runner, ...extraArgs);
}

async function runRetryLoopScenarios(
  label: string,
  Ctor: new (...args: unknown[]) => { runSerializable: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T> },
  extraArgCount: number,
) {
  // Escenario A -- conflicto transitorio detectado en COMMIT, se resuelve al segundo intento.
  {
    const runner = new FakeTxRunner(['commit-conflict', 'ok']);
    const service = makeServiceWithFakeRunner(Ctor, runner, extraArgCount) as unknown as {
      runSerializable: <T>(fn: (tx: unknown) => Promise<T>) => Promise<T>;
    };
    let executions = 0;
    const result = await (service as any).runSerializable(async () => {
      executions++;
      return 'GRANTED';
    });
    check(`${label} A: conflicto COMMIT transitorio -> se resuelve y la operación se completa`, result === 'GRANTED');
    check(`${label} A: la función envuelta solo produjo UN resultado final (ejecutada por el runner en cada intento, sin duplicar el efecto observable)`, executions === 1);
    check(`${label} A: exactamente 2 intentos de transacción (1 conflicto + 1 éxito)`, runner.attempts === 2);
  }

  // Escenario B -- P2034 sigue entrando al retry (no regresión del camino ya cubierto).
  {
    const runner = new FakeTxRunner(['p2034', 'ok']);
    const service = makeServiceWithFakeRunner(Ctor, runner, extraArgCount);
    const result = await (service as any).runSerializable(async () => 'GRANTED');
    check(`${label} B: P2034 sigue entrando al retry y la operación se completa`, result === 'GRANTED');
    check(`${label} B: exactamente 2 intentos de transacción`, runner.attempts === 2);
  }

  // Escenario C -- conflicto persistente (COMMIT) agota los 3 reintentos: el error se propaga, nunca estado parcial.
  {
    const runner = new FakeTxRunner(['commit-conflict', 'commit-conflict', 'commit-conflict']);
    const service = makeServiceWithFakeRunner(Ctor, runner, extraArgCount);
    let thrown: unknown = null;
    let sideEffectRan = false;
    try {
      await (service as any).runSerializable(async () => {
        sideEffectRan = true;
        return 'GRANTED';
      });
    } catch (error) {
      thrown = error;
    }
    check(`${label} C: reintentos agotados -> el error se propaga (no se traga)`, thrown !== null);
    check(`${label} C: el error propagado sigue siendo el conflicto real (no un error genérico distinto)`, isDriverAdapterConflict(thrown));
    check(`${label} C: exactamente 3 intentos (MAX_SERIALIZABLE_RETRIES), ni uno más`, runner.attempts === 3);
    check(`${label} C: ningún efecto de la función envuelta llegó a completarse (sin estado parcial)`, sideEffectRan === false);
  }

  // Escenario D -- error no relacionado nunca entra al retry, se propaga en el primer intento.
  {
    const runner = new FakeTxRunner(['unrelated']);
    const service = makeServiceWithFakeRunner(Ctor, runner, extraArgCount);
    let thrown: unknown = null;
    try {
      await (service as any).runSerializable(async () => 'GRANTED');
    } catch (error) {
      thrown = error;
    }
    check(`${label} D: error no relacionado con conflicto de serialización -> NO reintenta`, runner.attempts === 1);
    check(`${label} D: el error no relacionado se propaga tal cual`, thrown instanceof Error && (thrown as Error).message.includes('ECONNRESET'));
  }
}

function isDriverAdapterConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { name?: unknown; cause?: unknown };
  return candidate.name === 'DriverAdapterError' && typeof candidate.cause === 'object';
}

async function main() {
  console.log('=== Gate: corrección de hallazgo-latente -- conflictos de serialización en gamificación (XP/League) ===\n');

  console.log('-- 1. Predicado puro isSerializationConflict (XpGrantService) --');
  checkPredicate('XP', xpIsSerializationConflict);

  console.log('\n-- 2. Predicado puro isSerializationConflict (LeaguePointGrantService) --');
  checkPredicate('League', leagueIsSerializationConflict);

  console.log('\n-- 3. Bucle de reintento real -- XpGrantService.runSerializable --');
  // Constructor real: (txRunner, programRepo, ruleRepo, activityRepo, ledgerRepo, balanceRepo, attemptRepo) -- 6 args extra.
  await runRetryLoopScenarios('XP', XpGrantService as unknown as new (...args: unknown[]) => any, 6);

  console.log('\n-- 4. Bucle de reintento real -- LeaguePointGrantService.runSerializable --');
  // Constructor real: (txRunner, activityRepo, participationRepo, seasonRepo, groupRepo, ruleRepo, ledgerRepo) -- 6 args extra.
  await runRetryLoopScenarios('League', LeaguePointGrantService as unknown as new (...args: unknown[]) => any, 6);

  console.log(`\n${failures === 0 ? 'PASS' : 'FALLOS: ' + failures}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error('Error inesperado en el gate:', error);
  process.exit(1);
});
