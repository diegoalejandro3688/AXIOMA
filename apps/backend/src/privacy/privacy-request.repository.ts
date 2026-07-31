import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { PrivacyRequest } from '../generated/prisma/client';

/** Único punto de acceso a la tabla `privacy_request`. */
@Injectable()
export class PrivacyRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: { accountId: string; scheduledFor: Date }): Promise<PrivacyRequest> {
    return this.prisma.privacyRequest.create({ data: input });
  }

  /** La solicitud PENDING o PROCESSING más reciente de la cuenta, si existe. */
  findActiveByAccountId(accountId: string): Promise<PrivacyRequest | null> {
    return this.prisma.privacyRequest.findFirst({
      where: { accountId, status: { in: ['PENDING', 'PROCESSING'] } },
      orderBy: { requestedAt: 'desc' },
    });
  }

  findDue(now: Date): Promise<PrivacyRequest[]> {
    return this.prisma.privacyRequest.findMany({
      where: { status: 'PENDING', scheduledFor: { lte: now } },
    });
  }

  /**
   * Solicitudes que entraron a PROCESSING y nunca terminaron (el proceso se
   * cayó, una llamada a Firebase quedó colgada, etc.) -- candidatas a
   * reintento. `staleSince` = ahora menos el umbral de "atascada".
   */
  findStuckProcessing(staleSince: Date): Promise<PrivacyRequest[]> {
    return this.prisma.privacyRequest.findMany({
      where: { status: 'PROCESSING', processingStartedAt: { lte: staleSince } },
    });
  }

  /**
   * `preserveOriginalStart`: si ya tenía processingStartedAt (reintento),
   * se conserva -- no se resetea el reloj de "cuánto lleva atascada" en
   * cada intento fallido.
   */
  markProcessing(id: string, preserveOriginalStart: Date | null): Promise<PrivacyRequest> {
    return this.prisma.privacyRequest.update({
      where: { id },
      data: { status: 'PROCESSING', processingStartedAt: preserveOriginalStart ?? new Date() },
    });
  }

  markCompleted(id: string): Promise<PrivacyRequest> {
    return this.prisma.privacyRequest.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  markCancelled(id: string): Promise<PrivacyRequest> {
    return this.prisma.privacyRequest.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }
}
