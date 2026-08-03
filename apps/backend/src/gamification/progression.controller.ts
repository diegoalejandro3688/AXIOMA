import { BadRequestException, Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  levelProgressResponseSchema,
  streakResponseSchema,
  xpHistoryResponseSchema,
  type LevelProgressResponse,
  type StreakResponse,
  type XpHistoryResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { ProgressionService } from './progression.service';

/**
 * Endpoints de autoservicio del incremento "Progresión visible" (Bloque
 * II) -- ver docs/adr/BLOCK-II-DEFINITION.md. Deliberadamente separados de
 * `GamificationController` (que sirve exclusivamente rutas `_internal/*`
 * protegidas por `InternalOpsGuard`, Bloque I) -- estas son rutas de
 * estudiante autenticado, nunca de operaciones internas.
 *
 * Todos operan sobre `request.accountId` (AuthGuard) -- ningún endpoint
 * acepta un accountId del cliente, mismo criterio que ProgressController
 * (ADR-0014).
 */
@Controller('gamification/me')
@UseGuards(AuthGuard)
export class ProgressionController {
  constructor(private readonly progressionService: ProgressionService) {}

  @Get('level')
  async getLevel(@Req() request: AuthenticatedRequest): Promise<LevelProgressResponse> {
    const result = await this.progressionService.getLevelProgress(request.accountId);
    return levelProgressResponseSchema.parse(result);
  }

  @Get('streak')
  async getStreak(@Req() request: AuthenticatedRequest): Promise<StreakResponse> {
    const result = await this.progressionService.getStreak(request.accountId);
    return streakResponseSchema.parse(result);
  }

  @Get('xp-history')
  async getXpHistory(
    @Req() request: AuthenticatedRequest,
    @Query('limit') limitParam?: string,
    @Query('before') before?: string,
  ): Promise<XpHistoryResponse> {
    let limit: number | undefined;
    if (limitParam !== undefined) {
      limit = Number(limitParam);
      if (!Number.isInteger(limit) || limit <= 0) {
        throw new BadRequestException('limit debe ser un entero positivo');
      }
    }
    if (before !== undefined && Number.isNaN(Date.parse(before))) {
      throw new BadRequestException('before debe ser una fecha ISO válida');
    }

    const page = await this.progressionService.getXpHistory(request.accountId, { limit, before });
    return xpHistoryResponseSchema.parse({
      entries: page.entries.map((entry) => ({ ...entry, occurredAt: entry.occurredAt.toISOString() })),
      nextCursor: page.nextCursor,
    });
  }
}
