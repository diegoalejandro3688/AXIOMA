import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService, type MeCompetitiveProfileView } from './user.service';
import { ProgressService } from '../progress/progress.service';
import { CompetitiveHistoryService, type SeasonHistoryEntryView } from '../gamification/competitive-history.service';
import type { UserProfile } from '../generated/prisma/client';
import type { AcademicSummaryResponse } from '@axioma/contracts';

export interface MyAdvancedProfileView {
  profile: UserProfile | null;
  publicProfile: MeCompetitiveProfileView | null;
  academicSummary: AcademicSummaryResponse;
  competitiveHistory: SeasonHistoryEntryView[];
}

/** `NotFoundException` es la única forma de "sección todavía no existe" que producen `getProfile`/`getMyCompetitiveProfile` -- cualquier otro error se propaga tal cual (nunca se silencia un fallo real). */
async function orNullIfNotFound<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    if (error instanceof NotFoundException) return null;
    throw error;
  }
}

/**
 * LEF Bloque V, Incremento 5 ("Vista consolidada de perfil propio") -- ver
 * docs/adr/LEF-BLOCK-V-DEFINITION.md §13. Agregador de LECTURA PURO: compone
 * las cuatro respuestas ya construidas por los Incrementos 1-4, sin
 * recalcular ni reinterpretar ninguna de sus reglas -- este servicio no
 * conoce cosméticos, ranking, progreso académico ni temporadas, solo sabe
 * pedir cada pieza a su dueño y ensamblar el resultado.
 *
 * Las cuatro llamadas son independientes entre sí (`Promise.all`) -- ninguna
 * depende del resultado de otra, así que no hay razón para serializarlas.
 * `profile`/`publicProfile` pueden ser `null` (cuenta nueva sin
 * `UserProfile`/`PublicProfile` todavía) sin que el resto del agregado
 * falle -- `academicSummary`/`competitiveHistory` ya son deterministas para
 * una cuenta sin actividad (Incrementos 3/4), nunca lanzan por ausencia de
 * datos.
 */
@Injectable()
export class AdvancedProfileService {
  constructor(
    private readonly userService: UserService,
    private readonly progressService: ProgressService,
    private readonly competitiveHistoryService: CompetitiveHistoryService,
  ) {}

  async getMyAdvancedProfile(accountId: string): Promise<MyAdvancedProfileView> {
    const [profile, publicProfile, academicSummary, competitiveHistory] = await Promise.all([
      orNullIfNotFound(this.userService.getProfile(accountId)),
      orNullIfNotFound(this.userService.getMyCompetitiveProfile(accountId)),
      this.progressService.getAcademicSummary(accountId),
      this.competitiveHistoryService.getHistory(accountId),
    ]);

    return { profile, publicProfile, academicSummary, competitiveHistory };
  }
}
