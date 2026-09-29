import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { ValidatedGamificationActivity } from '../generated/prisma/client';

interface PendingGrantRow {
  id: string;
  account_id: string;
  source_domain: string;
  source_entity_type: string;
  source_entity_id: string;
  activity_type: string;
  validation_status: string;
  validation_rule_version: string;
  occurred_at: Date;
  validated_at: Date;
  deduplication_key: string;
  integrity_status: string;
}

function toActivity(row: PendingGrantRow): ValidatedGamificationActivity {
  return {
    id: row.id,
    accountId: row.account_id,
    // WEB-0D.1C-B1 -- `findPendingGrant` (única consulta que produce
    // `PendingGrantRow`) nunca selecciona filas pseudonimizadas: su propio
    // JOIN exige `account_id` real (excluye CLOSED, ver WEB-0D.1C-B0R), y
    // B1 no pseudonimiza ninguna fila todavía. `null` es exacto, no un
    // relleno de tipos.
    gamificationActorRef: null,
    sourceDomain: row.source_domain,
    sourceEntityType: row.source_entity_type,
    sourceEntityId: row.source_entity_id,
    activityType: row.activity_type,
    validationStatus: row.validation_status,
    validationRuleVersion: row.validation_rule_version,
    occurredAt: row.occurred_at,
    validatedAt: row.validated_at,
    deduplicationKey: row.deduplication_key,
    integrityStatus: row.integrity_status,
  };
}

/**
 * Único punto de acceso a `validated_gamification_activity` -- ver
 * docs/adr/0016-gamificacion-fundacion.md. `accountId` SIN FK a Account,
 * mismo criterio que CurriculumTopicProgress/StudentResponse (ADR-0014).
 */
@Injectable()
export class ValidatedGamificationActivityRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    accountId: string;
    sourceDomain: string;
    sourceEntityType: string;
    sourceEntityId: string;
    activityType: string;
    validationStatus: string;
    validationRuleVersion: string;
    occurredAt: Date;
    deduplicationKey: string;
    integrityStatus: string;
  }): Promise<ValidatedGamificationActivity> {
    return this.prisma.validatedGamificationActivity.create({ data: input });
  }

  findById(id: string): Promise<ValidatedGamificationActivity | null> {
    return this.prisma.validatedGamificationActivity.findUnique({ where: { id } });
  }

  findByDeduplicationKey(deduplicationKey: string): Promise<ValidatedGamificationActivity | null> {
    return this.prisma.validatedGamificationActivity.findUnique({ where: { deduplicationKey } });
  }

  findByAccountId(accountId: string): Promise<ValidatedGamificationActivity[]> {
    return this.prisma.validatedGamificationActivity.findMany({ where: { accountId }, orderBy: { occurredAt: 'asc' } });
  }

  /**
   * "Pendiente de otorgar XP" = sin xp_ledger_entry de tipo OTORGAMIENTO
   * asociado -- NUNCA un campo mutado en esta tabla (condición
   * arquitectónica explícita, ver docs/adr/0016-gamificacion-fundacion.md).
   * Excluye actividades en backoff (xp_grant_attempt.nextEligibleAt en el
   * futuro).
   *
   * Orden: `attempts` (NULLS FIRST) antes que `occurredAt`. El backoff por
   * sí solo NO evita starvation -- retrasa el reingreso de una actividad
   * sin regla, pero una vez que `nextEligibleAt` vence, esa actividad
   * vuelve a competir, y al ser más antigua que cualquier actividad nueva
   * (occurredAt anterior) la superaría SIEMPRE bajo un orden puro por
   * occurredAt. Con un backlog de actividades irresolubles (ninguna regla
   * llegará jamás a existir para su activityType) igual o mayor al tamaño
   * del lote, esto bloquea indefinidamente a actividades nuevas y
   * genuinamente pendientes -- se confirmó reproducido contra datos reales
   * (ver auditoría, Bloque IV Incremento 2). Priorizar por intentos deja
   * pasar primero a lo nunca intentado (attempts NULL/0) en cada ciclo;
   * lo que ya falló repetidas veces solo ocupa el cupo sobrante.
   *
   * SQL crudo, no `findMany` con `orderBy` anidado: Prisma solo admite el
   * modificador `nulls` en columnas propias del modelo consultado, no en
   * campos alcanzados a través de una relación (aquí, `xp_grant_attempt`
   * vía LEFT JOIN) -- `XpGrantAttemptOrderByWithRelationInput.attempts` es
   * `SortOrder` puro, sin variante `{ sort, nulls }`. Y el default de
   * Postgres para ASC es NULLS LAST (justo lo contrario de lo que se
   * necesita: una actividad sin intento todavía debe ir PRIMERO).
   */
  /**
   * WEB-0D.1C-B0R -- exclusión central de cuentas CLOSED en el propio
   * descubrimiento: `LEFT JOIN account` + `a.status IS DISTINCT FROM
   * 'CLOSED'` (`account` puede no tener fila para un accountId sintético de
   * gate/legado -- `IS DISTINCT FROM` trata `NULL` como "no es CLOSED",
   * dirección segura: nunca bloquea una cuenta real por un JOIN vacío).
   * Esto es lo que evita que una actividad de una cuenta ya cerrada se
   * siga redescubriendo en cada ciclo del cron -- nunca depende de que el
   * cierre haya limpiado `xp_grant_attempt` primero.
   *
   * WEB-0D.1C-B3-R1-ADDENDUM -- además de `a.status IS DISTINCT FROM
   * 'CLOSED'`, excluye cuentas con un `PrivacyRequest` en PROCESSING
   * (barrido de cierre definitivo EN CURSO, todavía ANTES de que
   * `Account.status` llegue a CLOSED -- ver B3-R1 §3). DELETION_PENDING
   * ORDINARIO (ventana de 30 días, sin barrido en curso) nunca tiene una
   * fila PROCESSING, así que esta cláusula NUNCA bloquea ese caso (A del
   * addendum) -- solo el caso (B), cierre definitivo activo.
   *
   * WEB-0D.1C-B4 §19/§20 -- `AND vga.account_id IS NOT NULL` explícito:
   * ESTE es el fix real que habilita B4. El `LEFT JOIN account` de arriba
   * tiene un punto ciego exacto cuando `vga.account_id` es `NULL` (fila ya
   * pseudonimizada): el JOIN no encuentra fila en `account`, `a.status` es
   * `NULL`, y `NULL IS DISTINCT FROM 'CLOSED'` evalúa `TRUE` -- la fila
   * parecería "no cerrada" y resucitaría en cada ciclo del cron, chocando
   * para siempre contra el guardia `!activity.accountId` de
   * `XpGrantService.grantForActivity` (B0R). Este filtro adicional cierra
   * ese punto ciego de forma independiente del JOIN -- una fila
   * pseudonimizada NUNCA vuelve a esta consulta, sin importar el estado de
   * `account`. Este era el motivo REAL por el que B3 difirió este modelo
   * (nunca una razón de negocio genuina) -- con este filtro, pseudonimizar
   * `ValidatedGamificationActivity` de una cuenta CLOSED es tan seguro como
   * los 5 modelos que B3 ya trata como INMEDIATE_SAFE (ver reporte B4 §C).
   */
  async findPendingGrant(limit: number, now: Date = new Date()): Promise<ValidatedGamificationActivity[]> {
    const rows = await this.prisma.$queryRaw<PendingGrantRow[]>`
      SELECT
        vga.id, vga.account_id, vga.source_domain, vga.source_entity_type, vga.source_entity_id,
        vga.activity_type, vga.validation_status, vga.validation_rule_version, vga.occurred_at,
        vga.validated_at, vga.deduplication_key, vga.integrity_status
      FROM validated_gamification_activity vga
      LEFT JOIN xp_grant_attempt xga ON xga.validated_activity_id = vga.id
      LEFT JOIN account a ON a.id = vga.account_id
      WHERE NOT EXISTS (
        SELECT 1 FROM xp_ledger_entry xle
        WHERE xle.validated_activity_id = vga.id AND xle.entry_type = 'OTORGAMIENTO'
      )
      AND (xga.validated_activity_id IS NULL OR xga.next_eligible_at <= ${now})
      AND vga.account_id IS NOT NULL
      AND a.status IS DISTINCT FROM 'CLOSED'
      AND NOT EXISTS (
        SELECT 1 FROM privacy_request pr WHERE pr.account_id = vga.account_id AND pr.status = 'PROCESSING'
      )
      ORDER BY xga.attempts ASC NULLS FIRST, vga.occurred_at ASC
      LIMIT ${limit}
    `;
    return rows.map(toActivity);
  }

  /**
   * STABILIZATION-B (Desafíos, filtro "actividad de estudio") -- lote de
   * `activityType` por id, ÚNICA fuente de provenance real de una actividad
   * (nunca se infiere desde el monto de XP otorgado -- dos `activityType`
   * distintos pueden compartir el mismo `baseXp`). `Map` vacío si `ids` está
   * vacío (sin round-trip innecesario).
   */
  async findActivityTypesByIds(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.validatedGamificationActivity.findMany({
      where: { id: { in: ids } },
      select: { id: true, activityType: true },
    });
    return new Map(rows.map((r) => [r.id, r.activityType]));
  }

  /**
   * VC4 MICROBLOQUE 3.1 -- fix de starvation confirmado en producción
   * (diagnóstico read-only 2026-09-29): la versión anterior de esta consulta
   * (`findMany` simple, `orderBy occurredAt asc`, `take limit`) traía las
   * `GRANT_BATCH_SIZE` filas MÁS ANTIGUAS de TODAS las cuentas activas sin
   * filtrar por elegibilidad real. Un backlog histórico de actividades
   * PERMANENTEMENTE no-otorgables (temporada ya FINALIZED, `occurredAt`
   * anterior al `joinedAt` vigente, o `activityType` sin
   * `LeaguePointRule` aplicable -- p.ej. `RESPUESTA_VALIDADA`/
   * `TEMA_COMPLETADO` desde que sus reglas expiraron, ver
   * `LEAGUE_POINT_RULES_V1_STUDY_RETIRED`) nunca se excluye de esta
   * consulta (nunca se marca "ya evaluada" en ningún lado -- ver ADR §9.7),
   * así que reaparece en CADA ciclo y ocupa el lote entero indefinidamente,
   * hambreando actividad nueva y genuinamente elegible de la MISMA o de
   * OTRAS cuentas (reproducido contra datos reales: 100/100 filas del lote
   * de producción eran de exclusión PERMANENTE, 0 elegibles).
   *
   * Fix: DISCOVERY-LEVEL ELIGIBILITY FILTERING -- esta consulta re-deriva,
   * en SQL, condiciones ESTÁTICAS de `LeaguePointGrantService.grantForActivity`
   * (participación ACTIVE + `joinedAt <= occurredAt`, temporada ACTIVE +
   * `occurredAt` en `[startsAt, endsAt)`, grupo OPEN/FULL, `LeaguePointRule`
   * ACTIVE aplicable al `activityType` en `occurredAt`, y -- MICROBLOQUE
   * 3.1, revisión final -- para `QUICK_QUESTION_ANSWERED` específicamente,
   * `quick_question_attempt.is_correct = true`). `grantForActivity` sigue
   * siendo la ÚNICA autoridad: relee todo esto de nuevo DENTRO de su
   * transacción SERIALIZABLE antes de escribir (§9.5) -- este filtro es una
   * OPTIMIZACIÓN de descubrimiento, nunca un atajo de autorización.
   *
   * ADVERTENCIA -- esto NO es "un falso negativo tarda un ciclo más" (esa
   * afirmación, presente en una versión anterior de este comentario, era
   * FALSA y fue corregida en la revisión final del microbloque): no existe
   * NINGÚN mecanismo de backoff/reintento/expiración para LP (a diferencia
   * de XP, que sí tiene `xp_grant_attempt.next_eligible_at`). Si UNA
   * condición de esta consulta excluyera por error una actividad que
   * `grantForActivity` SÍ otorgaría, esa actividad NUNCA volvería a ser
   * evaluada por nadie -- sería un UNDER-GRANT PERMANENTE Y SILENCIOSO, sin
   * logging ni métrica que lo distinga de "nunca ocurrió". Por eso cada
   * condición añadida aquí debe ser una precondición NECESARIA y
   * DEMOSTRADA contra el código real de `grantForActivity` (nunca una
   * aproximación), y cualquier causa terminal de skip que se añada en el
   * futuro a `grantForActivity` DEBE auditarse contra esta consulta antes
   * de asumir que el problema de starvation sigue resuelto.
   *
   * `dailyCap` (`DAILY_CAP_REACHED`) NO se filtra aquí -- ver
   * `LEAGUE_POINT_RULES_V1` (todas con `dailyCap: null` hoy, verificado por
   * `verify-league-point-grant-starvation-gate.ts`): mientras eso sea
   * cierto, `DAILY_CAP_REACHED` es estructuralmente inalcanzable y no puede
   * envenenar la cola. Si alguna vez se activa un `dailyCap` no-nulo, ESTA
   * CONSULTA DEBE AMPLIARSE primero (el gate está diseñado para fallar
   * explícitamente en ese momento, ver §8 del microbloque) -- de lo
   * contrario, actividades que agoten el cap de su día se convertirían en
   * poison rows terminales exactamente igual que `NOT_REWARDABLE`.
   *
   * Fairness (cross-account, revisión final): el orden NO es un `ORDER BY
   * occurredAt ASC` global -- usa `ROW_NUMBER() OVER (PARTITION BY
   * account_id ORDER BY occurred_at ASC)` y ordena por ese turno antes que
   * por `occurredAt`. Garantía REAL (sin sobreafirmar): el round-robin evita
   * que el backlog profundo de UNA cuenta monopolice el lote y consuma más
   * de un turno mientras otra cuenta con actividad elegible tiene turno 0
   * sin servir -- y da PROGRESO ACOTADO A TRAVÉS DE CICLOS (una cuenta
   * excluida de un ciclo por volumen agregado de OTRAS cuentas entra en un
   * número finito de ciclos siguientes, a medida que esas otras cuentas ya
   * otorgadas salen del conjunto elegible). NO garantiza que TODA cuenta
   * progrese en CADA ciclo individual: con más de `GRANT_BATCH_SIZE` cuentas
   * simultáneamente elegibles, algunas quedan fuera de un ciclo dado (ver
   * gate §6 -- caso de 101 cuentas).
   */
  findPendingLeagueGrant(activeAccountIds: string[], limit: number): Promise<ValidatedGamificationActivity[]> {
    if (activeAccountIds.length === 0) return Promise.resolve([]);
    return this.prisma.$queryRaw<PendingGrantRow[]>`
      WITH eligible AS (
        SELECT vga.id, vga.account_id, vga.source_domain, vga.source_entity_type, vga.source_entity_id,
               vga.activity_type, vga.validation_status, vga.validation_rule_version, vga.occurred_at,
               vga.validated_at, vga.deduplication_key, vga.integrity_status
        FROM validated_gamification_activity vga
        JOIN season_league_participation slp
          ON slp.account_id = vga.account_id
         AND slp.participation_status = 'ACTIVE'
         AND slp.joined_at <= vga.occurred_at
        JOIN game_season gs
          ON gs.id = slp.game_season_id
         AND gs.status = 'ACTIVE'
         AND vga.occurred_at >= gs.starts_at
         AND vga.occurred_at < gs.ends_at
        JOIN league_group lg
          ON lg.id = slp.league_group_id
         AND lg.status IN ('OPEN', 'FULL')
        JOIN league_point_rule lpr
          ON lpr.activity_type = vga.activity_type
         AND lpr.status = 'ACTIVE'
         AND vga.occurred_at >= lpr.effective_from
         AND (lpr.effective_until IS NULL OR vga.occurred_at < lpr.effective_until)
        -- MICROBLOQUE 3.1 (revisión final) -- Quick incorrecta es TERMINAL
        -- (isCorrect nunca cambia) y grantForActivity nunca escribe ledger
        -- para NOT_REWARDABLE, así que sin este filtro reaparecería en cada
        -- ciclo para siempre (mismo patrón exacto que el bug original, por
        -- otra causa). LEFT JOIN a propósito: una fila sin
        -- quick_question_attempt correspondiente (dato inconsistente, id
        -- huérfano) produce qqa.is_correct = NULL, y NULL = true nunca es
        -- verdadero -- la condición completa se evalúa false y la fila se
        -- EXCLUYE de discovery (degradación seguro hacia "no otorgar",
        -- nunca hacia un grant accidental). Acotado EXCLUSIVAMENTE a
        -- QUICK_QUESTION_ANSWERED: la primera rama del OR dispensa a
        -- cualquier otro activity_type sin tocar el LEFT JOIN.
        LEFT JOIN quick_question_attempt qqa
          ON vga.activity_type = 'QUICK_QUESTION_ANSWERED'
         AND qqa.id = vga.source_entity_id
        WHERE vga.account_id = ANY(${activeAccountIds}::uuid[])
          AND (vga.activity_type <> 'QUICK_QUESTION_ANSWERED' OR qqa.is_correct = true)
          AND NOT EXISTS (
            SELECT 1 FROM league_point_ledger_entry lple WHERE lple.validated_activity_id = vga.id
          )
      ),
      ranked AS (
        SELECT *, ROW_NUMBER() OVER (PARTITION BY account_id ORDER BY occurred_at ASC) AS turn
        FROM eligible
      )
      SELECT id, account_id, source_domain, source_entity_type, source_entity_id, activity_type,
             validation_status, validation_rule_version, occurred_at, validated_at, deduplication_key, integrity_status
      FROM ranked
      ORDER BY turn ASC, occurred_at ASC
      LIMIT ${limit}
    `.then((rows) => rows.map(toActivity));
  }
}
