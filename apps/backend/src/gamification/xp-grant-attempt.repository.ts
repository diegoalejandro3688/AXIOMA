import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { XpGrantAttempt } from '../generated/prisma/client';

/**
 * Único punto de acceso a `xp_grant_attempt` -- tabla auxiliar de
 * seguimiento, NUNCA `validated_gamification_activity` (condición
 * arquitectónica explícita). Solo registra resultados TRANSITORIOS
 * (`NO_ACTIVE_RULE`, `DAILY_CAP_REACHED`); un otorgamiento exitoso no pasa
 * por aquí -- la propia `xp_ledger_entry` es su registro terminal.
 */
@Injectable()
export class XpGrantAttemptRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByValidatedActivityId(validatedActivityId: string): Promise<XpGrantAttempt | null> {
    return this.prisma.xpGrantAttempt.findUnique({ where: { validatedActivityId } });
  }

  /**
   * Registra un intento sin otorgamiento: crea la fila si es el primer
   * intento, o incrementa `attempts` si ya existía -- siempre fijando
   * `nextEligibleAt` según la política de backoff del llamador.
   */
  upsertAttempt(input: {
    validatedActivityId: string;
    lastOutcome: string;
    nextEligibleAt: Date;
  }): Promise<XpGrantAttempt> {
    const now = new Date();
    return this.prisma.xpGrantAttempt.upsert({
      where: { validatedActivityId: input.validatedActivityId },
      create: {
        validatedActivityId: input.validatedActivityId,
        attempts: 1,
        lastOutcome: input.lastOutcome,
        lastAttemptedAt: now,
        nextEligibleAt: input.nextEligibleAt,
      },
      update: {
        attempts: { increment: 1 },
        lastOutcome: input.lastOutcome,
        lastAttemptedAt: now,
        nextEligibleAt: input.nextEligibleAt,
      },
    });
  }
}
