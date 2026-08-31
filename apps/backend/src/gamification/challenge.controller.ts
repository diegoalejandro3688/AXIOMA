import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { challengeSummarySchema, listChallengesResponseSchema, type ChallengeSummary, type ListChallengesResponse } from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { ChallengeService } from './challenge.service';
import type { AccountChallenge, ChallengeDefinition } from '../generated/prisma/client';

function toChallengeSummary(
  accountChallenge: AccountChallenge,
  definition: Pick<ChallengeDefinition, 'challengeKey' | 'name' | 'description' | 'challengeType'>,
  rewardXpBonus: number | null,
): ChallengeSummary {
  return challengeSummarySchema.parse({
    id: accountChallenge.id,
    challengeKey: definition.challengeKey,
    name: definition.name,
    description: definition.description,
    challengeType: definition.challengeType,
    targetValue: accountChallenge.targetValue,
    progressValue: accountChallenge.progressValue,
    challengeStatus: accountChallenge.challengeStatus,
    rewardXpBonus,
    periodStart: accountChallenge.periodStart.toISOString(),
    periodEnd: accountChallenge.periodEnd.toISOString(),
    acceptedAt: accountChallenge.acceptedAt.toISOString(),
    completedAt: accountChallenge.completedAt?.toISOString() ?? null,
    claimedAt: accountChallenge.claimedAt?.toISOString() ?? null,
  });
}

/**
 * Endpoints de autoservicio del Incremento 4 (Desafíos), sub-incremento
 * 4.c ("Reclamación explícita") -- ver docs/adr/BLOCK-III-DEFINITION.md
 * §4.17. Mismo prefijo/criterio que `ProgressionController`:
 * `request.accountId` (AuthGuard), nunca un id recibido del cliente.
 *
 * Sin superficie de descubrimiento de catálogo (§4.14): solo se listan los
 * `account_challenge` YA materializados de la cuenta, no
 * `challenge_definition` sin materializar.
 */
@Controller('gamification/me/challenges')
@UseGuards(AuthGuard)
export class ChallengeController {
  constructor(private readonly challengeService: ChallengeService) {}

  @Get()
  async list(@Req() request: AuthenticatedRequest): Promise<ListChallengesResponse> {
    const rows = await this.challengeService.listForAccount(request.accountId);
    return listChallengesResponseSchema.parse({
      challenges: rows.map((row) => toChallengeSummary(row, row.challengeDefinition, row.rewardXpBonus)),
    });
  }

  @Post(':accountChallengeId/claim')
  @HttpCode(HttpStatus.OK)
  async claim(@Req() request: AuthenticatedRequest, @Param('accountChallengeId') accountChallengeId: string): Promise<ChallengeSummary> {
    const { accountChallenge, definition } = await this.challengeService.claim(request.accountId, accountChallengeId);
    const rewardXpBonus = definition.rewardBundleId ? await this.challengeService.resolveRewardXpBonus(definition.rewardBundleId) : null;
    return toChallengeSummary(accountChallenge, definition, rewardXpBonus);
  }
}
