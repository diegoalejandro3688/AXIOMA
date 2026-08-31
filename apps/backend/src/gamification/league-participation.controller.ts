import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import {
  leagueParticipationBodySchema,
  getLeagueParticipationResponseSchema,
  postLeagueParticipationResponseSchema,
  type GetLeagueParticipationResponse,
  type PostLeagueParticipationResponse,
} from '@axioma/contracts';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { parseRequestBody } from '../platform/validation/parse-request-body';
import { LeagueEnrollmentService, type EnrolledParticipationView } from './league-enrollment.service';

function toEnrolledPayload(view: EnrolledParticipationView) {
  return {
    outcome: 'ENROLLED' as const,
    leagueName: view.leagueName,
    leagueTier: view.leagueTier,
    leaguePoints: view.leaguePoints,
    joinedAt: view.joinedAt.toISOString(),
    status: view.participationStatus,
    season: { startsAt: view.season.startsAt.toISOString(), endsAt: view.season.endsAt.toISOString() },
  };
}

/**
 * Endpoints de autoservicio de participación de liga (Bloque IV,
 * Incremento 5, sub-incremento 5.a) -- ver
 * docs/adr/LEF-BLOCK-IV-DEFINITION.md, auditoría previa a Incremento 5.
 * `request.accountId` (AuthGuard), nunca un id recibido del cliente --
 * mismo criterio que el resto de `/gamification/me/*`.
 *
 * Resuelve el hueco real encontrado en la auditoría: hasta este
 * sub-incremento, ninguna cuenta podía inscribirse en una liga por ningún
 * camino real (`LeagueEnrollmentService.joinActiveSeason`, Incremento 1,
 * nunca tenía disparador). Acción explícita e idempotente -- NUNCA
 * conectada a `XpGrantService` ni a ningún otorgamiento automático
 * (decisión del Product Owner, 2026-08-06).
 */
@Controller('gamification/me/league/participation')
@UseGuards(AuthGuard)
export class LeagueParticipationController {
  constructor(private readonly enrollmentService: LeagueEnrollmentService) {}

  /** Lectura PURA -- NUNCA crea participación (precisión obligatoria del Product Owner). */
  @Get()
  async getStatus(@Req() request: AuthenticatedRequest): Promise<GetLeagueParticipationResponse> {
    const outcome = await this.enrollmentService.getParticipationStatus(request.accountId);
    if (outcome.kind === 'ENROLLED') {
      return getLeagueParticipationResponseSchema.parse(toEnrolledPayload(outcome));
    }
    return getLeagueParticipationResponseSchema.parse({ outcome: outcome.kind });
  }

  /**
   * Acción idempotente -- devuelve la participación existente o recién
   * creada, mismo cuerpo en ambos casos (200 uniforme, mismo criterio que
   * Pregunta rápida 4.c). Sin cuerpo de entrada: `.strict()` vacío rechaza
   * cualquier propiedad -- tier/grupo/identidad NUNCA vienen del cliente.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async join(@Req() request: AuthenticatedRequest, @Body() body: unknown): Promise<PostLeagueParticipationResponse> {
    parseRequestBody(leagueParticipationBodySchema, body);
    const outcome = await this.enrollmentService.joinActiveSeason(request.accountId);
    if ('outcome' in outcome) {
      return postLeagueParticipationResponseSchema.parse({ outcome: 'NO_ACTIVE_SEASON' });
    }
    const view = await this.enrollmentService.describeParticipation(outcome.participation);
    return postLeagueParticipationResponseSchema.parse(toEnrolledPayload(view));
  }
}
