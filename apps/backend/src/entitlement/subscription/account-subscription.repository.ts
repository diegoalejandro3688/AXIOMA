import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import type { AccountSubscription } from '../../generated/prisma/client';
import type { DerivableSubscription } from './derive-subscription-tier';

/**
 * Datos NEUTRALES de una suscripcion verificada, listos para persistir. Un
 * subconjunto de `VerifiedSubscriptionSnapshot` (subscription/) -- se declara
 * aqui para no acoplar el repositorio (que vive en `entitlement/`) al modulo
 * de reconciliacion.
 *
 * NUNCA incluye `latestEventTime` -- esa cronologia solo la fija la RTDN
 * (C3.3). Ver `createFromVerified` / `updateFromVerified`.
 */
export interface VerifiedSubscriptionWriteData {
  accountId: string;
  purchaseToken: string;
  linkedPurchaseToken: string | null;
  /** `outOfAppPurchaseContext.expiredPurchaseToken` -- re-alta fuera de la app; solo atribucion, NO supersede. */
  resubscribedFromPurchaseToken: string | null;
  state: DerivableSubscription['state'];
  expiryTime: Date | null;
  startTime: Date | null;
  autoRenewing: boolean;
  acknowledged: boolean;
  productId: string;
  basePlanId: string | null;
  regionCode: string | null;
  testPurchase: boolean;
  cancelUserInitiated: boolean | null;
  /** Respuesta cruda del proveedor -- se guarda en `rawSnapshot` (Json), nunca se loguea. */
  rawSnapshot: Prisma.InputJsonValue;
}

type Db = PrismaService | Prisma.TransactionClient;

/**
 * PREMIUM V1 -- Capa 3 (Google Play Billing), C3.1 (LECTURA) + C3.2 (ESCRITURA).
 *
 * Repositorio del dominio de suscripcion. C3.1 solo resolvia la fila
 * "vigente" para derivar el tier; C3.2 anade las escrituras de la
 * reconciliacion de compra (`subscription/`). Las queries reales viven aqui;
 * los servicios pasan un `tx` para transacciones multi-escritura.
 *
 * Regla de seleccion DETERMINISTA (ADR seccion D.3 / task C3.1 seccion 7):
 * el historico es legitimo (una cuenta puede tener una fila EXPIRED vieja +
 * una fila nueva tras re-suscribirse). NUNCA es un `findFirst()` sin orden.
 *
 *   1. se EXCLUYEN las filas `SUPERSEDED` (rotacion de token EN VIVO);
 *   2. **GENERACION DE COMPRA** primero: `startTime` DESC, **NULLS LAST**.
 *      `SubscriptionPurchaseV2.startTime` (instante en que Google concedio la
 *      suscripcion) es el `expiryTime`/`autoRenewing`-independiente marcador
 *      de "que compra es la actual": una re-alta (in-app, fuera de la app, o
 *      con token rotado) es una compra NUEVA con un `startTime` MAS NUEVO que
 *      la anterior expirada. Es dato AUTORITATIVO de Google -- no se fabrica.
 *      Una renovacion NO cambia `startTime` (misma compra, misma fila);
 *   3. dentro de la MISMA generacion (o `startTime` empatado / ambos null):
 *      gana el EVENTO DE PROVEEDOR mas reciente -- `latestEventTime` DESC,
 *      **NULLS LAST** (`eventTimeMillis` de la RTDN, la senal de idempotencia
 *      de la ADR D.3/H.3). Una cronologia de proveedor DESCONOCIDA
 *      (`latestEventTime = null`) NUNCA adelanta a una conocida;
 *   4. el orden de ESCRITURA LOCAL (`updatedAt` DESC -> `id` DESC) es SOLO
 *      desempate determinista final -- NUNCA reemplaza (2) ni (3): una
 *      reconciliacion inocua/stale que toque `updatedAt` de una fila vieja no
 *      puede hacerla ganar.
 *
 * Consecuencias:
 *   - una compra NUEVA verificada (`latestEventTime = null` todavia) es la
 *     vigente aunque una fila HISTORICA tenga un `eventTimeMillis` de RTDN
 *     conocido -- el `startTime` mas nuevo manda (re-alta inmediata sin
 *     esperar el RTDN `SUBSCRIPTION_PURCHASED`);
 *   - una fila ACTIVE historica STALE (mismo `startTime` o mas viejo) NUNCA
 *     gana frente a una fila cuyo evento de proveedor mas reciente dice
 *     EXPIRED/REVOKED/ON_HOLD.
 */
@Injectable()
export class AccountSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentByAccountId(accountId: string, db?: Db): Promise<AccountSubscription | null> {
    return (db ?? this.prisma).accountSubscription.findFirst({
      where: { accountId, state: { not: 'SUPERSEDED' } },
      orderBy: [
        { startTime: { sort: 'desc', nulls: 'last' } },
        { latestEventTime: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async findByPurchaseToken(purchaseToken: string, db?: Db): Promise<AccountSubscription | null> {
    return (db ?? this.prisma).accountSubscription.findUnique({ where: { purchaseToken } });
  }

  /**
   * PB-1B (+ PB-1B-R1 §4) -- minimizacion de datos de facturacion al CIERRE
   * DEFINITIVO de la cuenta (PB-0A-R2 §11). Pone a NULL SOLO los campos
   * DIAGNOSTICOS que (a) son nullable en el schema y (b) ningun paso de ciclo
   * de vida necesita.
   *
   * NUNCA toca: `purchaseToken` / `linkedPurchaseToken` /
   * `resubscribedFromPurchaseToken` / `state` / `expiryTime` / `startTime` /
   * `productId` / `basePlanId` / `regionCode` / `testPurchase` / `accountId` /
   * `latestEventTime` / `acknowledgementState`.
   *
   * PB-1B-R1 §4: NO se toca `autoRenewing`. Es `BOOLEAN NOT NULL` -> escribir
   * `false` no seria "borrado de dato", seria CONVERTIR un diagnostico
   * posiblemente-verdadero en una afirmacion FALSA. Se conserva su valor
   * verdadero hasta que la fila entera se purgue por retencion.
   * `deriveSubscriptionTier` sigue sin leerlo.
   *
   * NUNCA muta `state` (la verdad de Google se conserva; el barrido de RTDN
   * puede seguir actualizandola). Devuelve el numero de filas afectadas.
   */
  async nullDiagnosticsForAccountClosure(accountId: string, db?: Db): Promise<number> {
    const { count } = await (db ?? this.prisma).accountSubscription.updateMany({
      where: { accountId },
      data: {
        rawSnapshot: Prisma.DbNull,
        latestNotificationType: null,
        cancelReason: null,
        cancelUserInitiated: null,
        cancelTime: null,
      },
    });
    return count;
  }

  /**
   * PB-1B -- candidatas a PURGA de retencion: fila en estado TERMINAL
   * (EXPIRED/REVOKED/SUPERSEDED) de una cuenta CLOSED con `closedAt` fijado y
   * `expiryTime` nulo o ya pasado. El resto de las clausulas (reloj de
   * retencion legal, ausencia de trabajo RTDN vivo) se re-verifican por fila
   * en el servicio de barrido -- este query solo acota el conjunto y trae el
   * ancla `closedAt` + `updatedAt` para el calculo del reloj. Lote acotado.
   */
  async findRetentionPurgeCandidates(now: Date, limit: number, db?: Db): Promise<
    Array<
      Pick<AccountSubscription, 'id' | 'purchaseToken' | 'linkedPurchaseToken' | 'resubscribedFromPurchaseToken' | 'accountId' | 'updatedAt' | 'state'> & {
        account: { closedAt: Date | null };
      }
    >
  > {
    return (db ?? this.prisma).accountSubscription.findMany({
      where: {
        state: { in: ['EXPIRED', 'REVOKED', 'SUPERSEDED'] },
        account: { status: 'CLOSED', closedAt: { not: null } },
        OR: [{ expiryTime: null }, { expiryTime: { lt: now } }],
      },
      select: {
        id: true,
        purchaseToken: true,
        linkedPurchaseToken: true,
        resubscribedFromPurchaseToken: true,
        accountId: true,
        updatedAt: true,
        state: true,
        account: { select: { closedAt: true } },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
    });
  }

  /**
   * PB-1B -- borrado IDEMPOTENTE de una fila de suscripcion (purga de
   * retencion). `deleteMany` con el `id` -> `count` 0 si otra corrida ya la
   * elimino. Re-afirma en el `where` las precondiciones que no pueden haber
   * cambiado dentro de la misma transaccion (estado terminal + cuenta CLOSED)
   * como red de seguridad final.
   */
  async purgeRetentionRow(id: string, db?: Db): Promise<number> {
    const { count } = await (db ?? this.prisma).accountSubscription.deleteMany({
      where: {
        id,
        state: { in: ['EXPIRED', 'REVOKED', 'SUPERSEDED'] },
        account: { status: 'CLOSED' },
      },
    });
    return count;
  }

  private commonWriteFields(d: VerifiedSubscriptionWriteData) {
    return {
      linkedPurchaseToken: d.linkedPurchaseToken,
      resubscribedFromPurchaseToken: d.resubscribedFromPurchaseToken,
      state: d.state,
      expiryTime: d.expiryTime,
      startTime: d.startTime,
      autoRenewing: d.autoRenewing,
      acknowledgementState: (d.acknowledged ? 'ACKNOWLEDGED' : 'PENDING') as 'ACKNOWLEDGED' | 'PENDING',
      productId: d.productId,
      basePlanId: d.basePlanId,
      regionCode: d.regionCode,
      testPurchase: d.testPurchase,
      cancelUserInitiated: d.cancelUserInitiated,
      rawSnapshot: d.rawSnapshot,
    };
  }

  /**
   * Fila NUEVA a partir de un snapshot verificado (C3.2). `latestEventTime`
   * queda `null` a proposito -- `subscriptionsv2.get` no aporta la cronologia
   * de proveedor (solo la RTDN, C3.3). Ver task C3.2 seccion 3.
   */
  async createFromVerified(d: VerifiedSubscriptionWriteData, db?: Db): Promise<AccountSubscription> {
    return (db ?? this.prisma).accountSubscription.create({
      data: {
        accountId: d.accountId,
        provider: 'GOOGLE_PLAY',
        purchaseToken: d.purchaseToken,
        ...this.commonWriteFields(d),
        // latestEventTime / latestNotificationType: NO se fijan aqui (C3.3).
      },
    });
  }

  /**
   * Actualiza una fila existente con un snapshot verificado mas nuevo (C3.2).
   * NO toca `latestEventTime` ni `latestNotificationType`: si la fila ya
   * tenia una cronologia de proveedor (de una RTDN previa), una reconsulta
   * directa NUNCA la borra ni la reemplaza. Ver task C3.2 seccion 3.
   */
  async updateFromVerified(id: string, d: VerifiedSubscriptionWriteData, db?: Db): Promise<AccountSubscription> {
    return (db ?? this.prisma).accountSubscription.update({
      where: { id },
      data: this.commonWriteFields(d),
    });
  }

  /** Marca una fila predecesora como reemplazada por rotacion de token (ADR D.4). */
  async markSuperseded(id: string, db?: Db): Promise<AccountSubscription> {
    return (db ?? this.prisma).accountSubscription.update({ where: { id }, data: { state: 'SUPERSEDED' } });
  }

  /** Marca una fila como acknowledgeada (tras un `acknowledge` exitoso en Google). */
  async markAcknowledged(id: string, db?: Db): Promise<AccountSubscription> {
    return (db ?? this.prisma).accountSubscription.update({ where: { id }, data: { acknowledgementState: 'ACKNOWLEDGED' } });
  }

  /**
   * Aplica la cronologia AUTORITATIVA de proveedor (C3.3). SOLO se llama desde
   * la reconciliacion cuando una RTDN aporta un `eventTimeMillis` MAS NUEVO que
   * el guardado -- la monotonicidad la decide `resolveProviderEventTimeUpdate`
   * (puro), aqui solo se persiste el resultado. `createFromVerified` /
   * `updateFromVerified` NUNCA tocan estas columnas: una reconsulta directa
   * (movil, C3.2) jamas fija ni retrocede la cronologia.
   */
  async applyProviderEvent(
    id: string,
    data: { latestEventTime: Date; latestNotificationType: string | null },
    db?: Db,
  ): Promise<AccountSubscription> {
    return (db ?? this.prisma).accountSubscription.update({
      where: { id },
      data: { latestEventTime: data.latestEventTime, latestNotificationType: data.latestNotificationType },
    });
  }
}

/**
 * Proyecta una fila Prisma `AccountSubscription` a la forma MINIMA que
 * consume la funcion pura `deriveSubscriptionTier` -- deja fuera todo lo
 * diagnostico/auditoria y todo lo de transporte.
 */
export function toDerivableSubscription(row: AccountSubscription | null): DerivableSubscription | null {
  if (row === null) return null;
  return {
    state: row.state,
    expiryTime: row.expiryTime,
    autoRenewing: row.autoRenewing,
  };
}
