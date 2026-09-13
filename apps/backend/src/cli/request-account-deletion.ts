import 'reflect-metadata';
import * as readline from 'node:readline/promises';
import { NestFactory } from '@nestjs/core';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { AppModule } from '../app.module';
import { AuthIdentityRepository } from '../auth/auth-identity.repository';
import { AccountRepository } from '../auth/account.repository';
import { PrivacyService } from '../privacy/privacy.service';

/**
 * F1-A.2 -- ruta de operador para INICIAR la eliminación canónica de una
 * cuenta a partir de una solicitud recibida fuera de la app (soporte por
 * correo). DELIBERADAMENTE no es un endpoint HTTP -- mismo precedente que
 * `recover-account.ts` / `moderate-public-identity.ts`: requiere acceso
 * operativo al servidor + `DATABASE_URL`, nunca alcanzable por una cuenta de
 * estudiante (este archivo no importa `auth/auth.guard` ni expone ruta).
 *
 * Regla de verificación de identidad V1 (decisión de producto, no técnica):
 * un operador humano SOLO debe ejecutar este comando después de confirmar
 * que el correo de la solicitud coincide con el correo ya asociado a la
 * cuenta ZETRYND. Este script NO autentica al remitente -- no puede ni debe
 * pretender probar la titularidad del correo. Es únicamente el conector de
 * ejecución hacia el ciclo de vida ya existente y aprobado
 * (`PrivacyService.requestAccountDeletion`), reutilizado sin duplicar lógica.
 *
 * No borra ningún dato directamente: crea la `PrivacyRequest` canónica con
 * la misma ventana de recuperación de 30 días, el mismo retiro inmediato de
 * perfil público y el mismo barrido final que ya usa el flujo dentro de la
 * app -- ver `PrivacyService.requestAccountDeletion`.
 *
 * Uso:
 *   node dist/cli/request-account-deletion.js <email> [--yes]
 *
 * `--yes` omite el prompt de confirmación interactivo (uso en gates/scripts
 * no interactivos); en uso manual por un operador, se omite y el comando
 * pide confirmación explícita antes de mutar nada.
 *
 * NUNCA se loguea el email de entrada -- solo el `accountId` resuelto, el
 * estado de la cuenta y el resultado de la operación.
 */

export type ResolveAccountResult =
  | { ok: true; accountId: string; accountStatus: string }
  | { ok: false; reason: 'malformed_input' | 'no_match' };

/**
 * Resuelve EXACTAMENTE una cuenta a partir de un email de operador, o falla
 * sin escribir nada. Reutiliza `AuthIdentityRepository.findAnyByEmail` (ya
 * usado por la regla de rechazo de email duplicado en `AuthService`) --
 * misma normalización que `auth.service.ts:44` (`trim().toLowerCase()`).
 */
export async function resolveAccountByEmail(
  authIdentityRepo: AuthIdentityRepository,
  rawEmail: string,
  accountStatusOf: (accountId: string) => Promise<string | null>,
): Promise<ResolveAccountResult> {
  const emailNormalized = rawEmail.trim().toLowerCase();
  // Chequeo de forma mínimo -- sin validador RFC completo (mismo criterio
  // que `auth.service.ts`, que confía en la verificación ya hecha por
  // Firebase y solo normaliza). Un input claramente no-email falla cerrado.
  if (emailNormalized.length === 0 || !emailNormalized.includes('@') || /\s/.test(emailNormalized)) {
    return { ok: false, reason: 'malformed_input' };
  }

  const identity = await authIdentityRepo.findAnyByEmail(emailNormalized);
  if (!identity) {
    return { ok: false, reason: 'no_match' };
  }

  const accountStatus = await accountStatusOf(identity.accountId);
  if (!accountStatus) {
    return { ok: false, reason: 'no_match' };
  }
  return { ok: true, accountId: identity.accountId, accountStatus };
}

async function confirm(question: string): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(question);
    return answer.trim().toLowerCase() === 'y' || answer.trim().toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const yesFlag = args.includes('--yes');
  const email = args.find((a) => a !== '--yes');

  if (!email) {
    console.error('Uso: node dist/cli/request-account-deletion.js <email> [--yes]');
    process.exitCode = 1;
    return;
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn', 'log'] });
  try {
    const authIdentityRepo = app.get(AuthIdentityRepository);
    const accountRepo = app.get(AccountRepository);
    const privacyService = app.get(PrivacyService);

    const resolution = await resolveAccountByEmail(authIdentityRepo, email, async (accountId) => {
      const account = await accountRepo.findById(accountId);
      return account?.status ?? null;
    });

    if (!resolution.ok) {
      if (resolution.reason === 'malformed_input') {
        console.error('Entrada inválida: no parece un email.');
      } else {
        console.error('No se encontró ninguna cuenta asociada a ese email.');
      }
      process.exitCode = 1;
      return;
    }

    console.log(`Cuenta resuelta: ${resolution.accountId}`);
    console.log(`Estado actual: ${resolution.accountStatus}`);
    console.log('Acción propuesta: iniciar PrivacyService.requestAccountDeletion (ventana de recuperación de 30 días).');

    if (!yesFlag) {
      const confirmed = await confirm('¿Confirmar solicitud de eliminación para esta cuenta? (y/N) ');
      if (!confirmed) {
        console.log('Cancelado por el operador. No se realizó ningún cambio.');
        process.exitCode = 1;
        return;
      }
    }

    try {
      await privacyService.requestAccountDeletion(resolution.accountId);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        console.error(`Rechazado por el servicio canónico: ${error.message}`);
        process.exitCode = 1;
        return;
      }
      throw error;
    }

    console.log(`Solicitud de eliminación creada para accountId=${resolution.accountId} en ${new Date().toISOString()}.`);
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Fallo inesperado:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
