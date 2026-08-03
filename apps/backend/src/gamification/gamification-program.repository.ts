import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { GamificationProgram, GamificationProgramStatus } from '../generated/prisma/client';

/** Único punto de acceso a `gamification_program` -- ver docs/adr/0016-gamificacion-fundacion.md. */
@Injectable()
export class GamificationProgramRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: {
    programKey: string;
    name: string;
    description?: string | null;
    programType: string;
    status?: GamificationProgramStatus;
  }): Promise<GamificationProgram> {
    return this.prisma.gamificationProgram.create({ data: input });
  }

  findById(id: string): Promise<GamificationProgram | null> {
    return this.prisma.gamificationProgram.findUnique({ where: { id } });
  }

  findByProgramKey(programKey: string): Promise<GamificationProgram | null> {
    return this.prisma.gamificationProgram.findUnique({ where: { programKey } });
  }

  /** Solo programas ACTIVE pueden otorgar XP -- ver docs/adr/0016-gamificacion-fundacion.md. */
  async findActiveByProgramKey(programKey: string): Promise<GamificationProgram | null> {
    const program = await this.findByProgramKey(programKey);
    return program && program.status === 'ACTIVE' ? program : null;
  }
}
