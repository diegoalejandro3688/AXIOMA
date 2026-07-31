import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { UserProfile } from '../generated/prisma/client';

/** Único punto de acceso a la tabla `user_profile`. */
@Injectable()
export class UserProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByAccountId(accountId: string): Promise<UserProfile | null> {
    return this.prisma.userProfile.findUnique({ where: { accountId } });
  }

  create(input: { accountId: string; displayName: string; timezone: string }): Promise<UserProfile> {
    return this.prisma.userProfile.create({ data: input });
  }

  update(accountId: string, input: { displayName?: string; timezone?: string }): Promise<UserProfile> {
    return this.prisma.userProfile.update({ where: { accountId }, data: input });
  }

  /** `deleteMany` -- nunca lanza si no hay fila que borrar (0 filas afectadas es un resultado válido). */
  async deleteByAccountId(accountId: string): Promise<number> {
    const result = await this.prisma.userProfile.deleteMany({ where: { accountId } });
    return result.count;
  }
}
