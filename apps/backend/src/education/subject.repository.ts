import { Injectable } from '@nestjs/common';
import { PrismaService } from '../platform/prisma/prisma.service';
import type { Subject } from '../generated/prisma/client';

/**
 * `subjectKey`s que son PLOMERÍA EDITORIAL de otro dominio y NUNCA parte del
 * catálogo Study -- ver docs/adr/0024-ensayos-foundation.md. El banco de
 * Ensayos necesita persistir sus `QuestionVersion` bajo un `CurriculumTopic`
 * (FK obligatoria), y ese topic necesita un `Subject`; ese Subject
 * (`'ensayos'`) es un contenedor técnico, no una materia que el estudiante
 * pueda estudiar.
 *
 * `findAllActive` los excluye: es el ÚNICO listador de materias del sistema
 * (lo consumen el catálogo del estudiante, el resumen académico y la matriz
 * de cobertura), y ninguno de esos debe ver un contenedor técnico. La
 * resolución puntual por id/clave (`findById`/`findByKey`) NO filtra -- ahí
 * quien pregunta ya sabe exactamente qué materia quiere.
 */
export const NON_STUDY_SUBJECT_KEYS: readonly string[] = ['ensayos'];

/** Repositorio propio del agregado Subject (dominio EDUCATION). Ver ADR-0012. */
@Injectable()
export class SubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Materias del catálogo -- activas y no contenedores técnicos
   * (`NON_STUDY_SUBJECT_KEYS`, ADR-0024). Único listador de materias del
   * sistema; su predicado se mantiene idéntico para los cuatro lectores de
   * §11.1 (invariante 19).
   */
  findAllActive(): Promise<Subject[]> {
    return this.prisma.subject.findMany({
      where: { status: 'ACTIVE', subjectKey: { notIn: [...NON_STUDY_SUBJECT_KEYS] } },
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
