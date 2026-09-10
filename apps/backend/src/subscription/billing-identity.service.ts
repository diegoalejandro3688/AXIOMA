import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { AccountRepository } from '../auth/account.repository';

const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';
const MAX_PROVISION_ATTEMPTS = 3;

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), PB-1A.
 *
 * Aprovisiona y devuelve `billingAccountRef` -- el identificador OPACO,
 * ALEATORIO y ESTABLE de la cuenta que el movil pasa a `launchBillingFlow`
 * (Google lo recibe como `obfuscatedAccountId`) y que ZETRYND usa para
 * atribuir eventos RTDN. Se persiste en `Account.obfuscatedAccountId` de forma
 * PEREZOSA: la primera llamada lo genera (`crypto.randomUUID()`), las
 * siguientes devuelven el MISMO valor.
 *
 * Invariantes (PB-0A-R2 / PB-1A):
 *   - NUNCA se deriva de `account.id` / Firebase UID / username / email / reloj
 *     / secuencia -- es 122 bits de aleatoriedad de un CSPRNG.
 *   - NUNCA se rota en llamadas ordinarias.
 *   - El movil NUNCA lo genera; el backend NUNCA acepta uno del cliente.
 *   - Aprovisionamiento efectivamente IDEMPOTENTE desde la vista del cliente:
 *     dos primeras llamadas concurrentes convergen en un unico valor
 *     persistido (UPDATE condicional atomico en el repositorio) y devuelven ese
 *     mismo valor -- nunca un 500, nunca dos valores, nunca una rotacion.
 */
@Injectable()
export class BillingIdentityService {
  private readonly logger = new Logger(BillingIdentityService.name);

  constructor(private readonly accounts: AccountRepository) {}

  async provisionBillingAccountRef(accountId: string): Promise<string> {
    for (let attempt = 1; attempt <= MAX_PROVISION_ATTEMPTS; attempt += 1) {
      const existing = await this.accounts.findObfuscatedAccountId(accountId);
      if (existing) return existing;

      const candidate = randomUUID();
      try {
        const applied = await this.accounts.tryProvisionObfuscatedAccountId(accountId, candidate);
        if (applied) return candidate;
        // Otra escritura concurrente fijo el valor primero -- se re-lee el ganador.
        const winner = await this.accounts.findObfuscatedAccountId(accountId);
        if (winner) return winner;
        // Ni fijo esta llamada ni hay valor -> la cuenta pudo desaparecer entre
        // medias; se deja que el siguiente intento lo confirme.
      } catch (error) {
        // Colision del UUID aleatorio contra el ref de OTRA cuenta (unicidad
        // global). Con 122 bits es practicamente imposible; se reintenta con
        // un valor nuevo, acotado.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === UNIQUE_CONSTRAINT_VIOLATION
        ) {
          this.logger.warn(`colision de billingAccountRef al aprovisionar (intento ${attempt}/${MAX_PROVISION_ATTEMPTS}) -- reintentando`);
          continue;
        }
        throw error;
      }
    }
    throw new Error('No se pudo aprovisionar billingAccountRef tras varios intentos.');
  }
}
