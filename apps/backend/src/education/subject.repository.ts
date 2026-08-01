import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Subject } from '../generated/prisma/client';

/** Repositorio propio del agregado Subject (dominio EDUCATION). Ver ADR-0012. */
@Injectable()
export class SubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAllActive(): Promise<Subject[]> {
    return this.prisma.subject.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { displayOrder: 'asc' },
    });
  }

  findById(id: string): Promise<Subject | null> {
    return this.prisma.subject.findUnique({ where: { id } });
  }

  findByKey(subjectKey: string): Promise<Subject | null> {
    return this.prisma.subject.findUnique({ where: { subjectKey } });
  }
}
