import { Module } from '@nestjs/common';
import { AdministrationModule } from '../administration/administration.module';
import { EducationModule } from '../education/education.module';
import { EditorialController } from './editorial.controller';

/**
 * Fachada HTTP editorial -- LEF Bloque VII, Incremento 3.
 *
 * Módulo deliberadamente VACÍO de providers: no tiene lógica propia. Existe
 * únicamente para que el controller pueda depender a la vez de
 * `AdministrationModule` (identidad y auditoría, Incremento 2) y de
 * `EducationModule` (autoridad de publicación, invariante 15) SIN crear una
 * dependencia circular entre esos dos.
 *
 *   EDUCATION      -> ADMINISTRATION   (para escribir la auditoría en su tx)
 *   EDITORIAL(este)-> ambos            (solo para el controller)
 *   ADMINISTRATION -> nada de lo anterior
 *
 * No importa `AuthModule` (sesión de estudiante) ni `InternalOpsModule`
 * (clave compartida), ni ningún módulo de PROGRESS/GAMIFICATION/PRIVACY/AI.
 */
@Module({
  imports: [AdministrationModule, EducationModule],
  controllers: [EditorialController],
})
export class EditorialModule {}
