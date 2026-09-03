import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../platform/prisma/prisma.service';
import type { AccountSubscription, Prisma } from '../../generated/prisma/client';
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
 * una fila nueva tras resubscribe con token rotado). NUNCA es un
 * `findFirst()` sin orden.
 *
 *   1. se EXCLUYEN las filas `SUPERSEDED` (reemplazadas por rotacion de token);
 *   2. entre las elegibles gana la del EVENTO DE PROVEEDOR mas reciente:
 *      `latestEventTime` DESC, **NULLS LAST**. `latestEventTime` es la
 *      cronologia AUTORITATIVA de Google (`eventTimeMillis` de la RTDN /
 *      instante de la respuesta de `subscriptionsv2.get`) -- la misma senal
 *      que la ADR (seccion D.3 / H.3) usa para idempotencia y para descartar
 *      RTDN atrasados. Una fila cuya cronologia de proveedor es DESCONOCIDA
 *      (`latestEventTime = null`, p. ej. una fila de C3.1 todavia sin evento
 *      real) NUNCA adelanta a una fila con cronologia conocida;
 *   3. el orden de ESCRITURA LOCAL (`updatedAt`) es SOLO desempate
 *      determinista (dos filas con el mismo `latestEventTime`, o ambas
 *      `null`) -> `updatedAt` DESC -> `id` DESC. NUNCA reemplaza la
 *      cronologia del proveedor: una reconciliacion inocua/stale que toque
 *      `updatedAt` de una fila vieja no puede hacerla ganar.
 *
 * Consecuencia: una fila ACTIVE historica NUNCA gana frente a una fila cuyo
 * evento de proveedor es mas reciente y dice EXPIRED/REVOKED/ON_HOLD. Los
 * registros historicos jamas conceden Premium por accidente cuando un evento
 * de proveedor mas nuevo dice lo contrario.
 */
@Injectable()
export class AccountSubscriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findCurrentByAccountId(accountId: string, db?: Db): Promise<AccountSubscription | null> {
    return (db ?? this.prisma).accountSubscription.findFirst({
      where: { accountId, state: { not: 'SUPERSEDED' } },
      orderBy: [
        { latestEventTime: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
        { id: 'desc' },
      ],
    });
  }

  async findByPurchaseToken(purchaseToken: string, db?: Db): Promise<AccountSubscription | null> {
    return (db ?? this.prisma).accountSubscription.findUnique({ where: { purchaseToken } });
  }

  private commonWriteFields(d: VerifiedSubscriptionWriteData) {
    return {
      linkedPurchaseToken: d.linkedPurchaseToken,
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
