import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { AuthIdentity } from '../generated/prisma/client';

/** Único punto de acceso a la tabla `auth_identity`. */
@Injectable()
export class AuthIdentityRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByProviderSubject(providerCode: string, providerSubject: string): Promise<AuthIdentity | null> {
    return this.prisma.authIdentity.findUnique({
      where: { providerCode_providerSubject: { providerCode, providerSubject } },
    });
  }

  /** Cualquier identidad (de cualquier cuenta) que ya use este email -- para la regla de rechazo. */
  findAnyByEmail(emailNormalized: string): Promise<AuthIdentity | null> {
    return this.prisma.authIdentity.findFirst({ where: { emailNormalized } });
  }

  findAllByAccountId(accountId: string): Promise<AuthIdentity[]> {
    return this.prisma.authIdentity.findMany({ where: { accountId } });
  }

  create(input: {
    accountId: string;
    providerCode: string;
    providerSubject: string;
    emailNormalized: string;
    emailVerifiedAt: Date | null;
  }): Promise<AuthIdentity> {
    return this.prisma.authIdentity.create({ data: input });
  }

  touchLastUsed(id: string, emailVerifiedAt: Date | null): Promise<AuthIdentity> {
    return this.prisma.authIdentity.update({
      where: { id },
      data: { lastUsedAt: new Date(), emailVerifiedAt },
    });
  }

  markUnlinked(id: string): Promise<AuthIdentity> {
    return this.prisma.authIdentity.update({ where: { id }, data: { unlinkedAt: new Date() } });
  }

  /** Cierre definitivo: sustituye el email por un valor sin información personal. */
  anonymizeEmail(id: string): Promise<AuthIdentity> {
    return this.prisma.authIdentity.update({
      where: { id },
      data: { emailNormalized: `anonymized-${id}@deleted.invalid` },
    });
  }
}
