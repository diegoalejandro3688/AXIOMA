import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ExamRewardStatus } from '@axioma/contracts';
import { ValidatedGamificationActivityRepository } from './validated-gamification-activity.repository';
import { XpLedgerEntryRepository } from './xp-ledger-entry.repository';
import { buildActivityDedupKeyV2 } from './gamification-key';

export interface ExamRewardStatusResult {
  status: ExamRewardStatus;
  xpAmount: number | null;
}

/**
 * VC4 MICROBLOQUE 11 -- lectura AUTORITATIVA de "¿el backend ya otorgó XP
 * real por este (accountId, examId)?" -- ver docstring de
 * `examRewardStatusResponseSchema` (contracts). Servicio NUEVO, deliberadamente
 * SEPARADO de `GamificationService` (nunca un parámetro de constructor
 * adicional ahí -- `verify-resource-completion-gate.ts` lo instancia
 * posicionalmente con solo 2 args, y añadir aquí habría sido el mismo riesgo
 * de ruptura que B2 ya documentó para `config`). Solo lee
 * `ValidatedGamificationActivity`/`XpLedgerEntry` -- nunca escribe nada,
 * nunca otorga XP síncronamente, nunca sortea el outbox/scheduler real.
 *
 * Misma construcción de `deduplicationKey` que `GamificationService` al
 * ingerir `exam_completed` (`buildActivityDedupKeyV2`, `gamification-key.ts`)
 * -- si esto alguna vez divergiera de la escritura real, este endpoint
 * respondería PENDING para siempre en vez de un falso GRANTED (fail-closed:
 * peor caso es "nunca ves el burst", nunca "ves un burst falso").
 */
@Injectable()
export class ExamRewardStatusService {
  constructor(
    private readonly activityRepo: ValidatedGamificationActivityRepository,
    private readonly ledgerRepo: XpLedgerEntryRepository,
    // Mismo criterio que `GamificationService.config` -- opcional, cae a
    // `process.env` cuando no hay `ConfigService` registrado (gates).
    private readonly config?: ConfigService,
  ) {}

  private getGamificationSecret(): string {
    const secret = this.config?.get<string>('GAMIFICATION_ACTOR_SECRET') ?? process.env.GAMIFICATION_ACTOR_SECRET;
    if (!secret) {
      throw new Error('GAMIFICATION_ACTOR_SECRET no está configurado -- no se puede derivar el estado de recompensa.');
    }
    return secret;
  }

  /**
   * `accountId` SIEMPRE viene de `request.accountId` (identidad autenticada
   * server-side) -- el llamador (controller) nunca debe aceptar un
   * `accountId` del cuerpo/query del cliente (§18 del microbloque). Este
   * método en sí mismo no valida eso -- es responsabilidad del controller,
   * documentada aquí para que ningún llamador futuro la omita.
   */
  async getExamRewardStatus(accountId: string, examId: string): Promise<ExamRewardStatusResult> {
    const deduplicationKey = buildActivityDedupKeyV2('exam_completed', accountId, () => this.getGamificationSecret(), { examId });
    const activity = await this.activityRepo.findByDeduplicationKey(deduplicationKey);
    if (!activity) {
      // Ni siquiera existe la ValidatedGamificationActivity todavía -- el
      // outbox `exam_completed` puede no haberse procesado aún (PENDING),
      // o esta cuenta nunca completó este examen. Ambos casos son
      // indistinguibles desde aquí y ambos son, correctamente, PENDING --
      // nunca GRANTED sin evidencia.
      return { status: 'PENDING', xpAmount: null };
    }

    const grant = await this.ledgerRepo.findGrantByValidatedActivityId(activity.id);
    if (!grant) {
      // La actividad existe pero XpGrantScheduler todavía no corrió (o está
      // en backoff) -- PENDING, nunca GRANTED optimista.
      return { status: 'PENDING', xpAmount: null };
    }

    return { status: 'GRANTED', xpAmount: grant.xpAmount };
  }
}
