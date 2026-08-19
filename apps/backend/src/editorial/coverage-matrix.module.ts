import { Module } from '@nestjs/common';
import { AdministrationModule } from '../administration/administration.module';
import { EducationModule } from '../education/education.module';
import { CoverageMatrixController } from './coverage-matrix.controller';

/**
 * Módulo de la Content Coverage Matrix -- LEF Bloque VII, Incremento 5.
 * Ver LEF-BLOCK-VII-DEFINITION.md §12.5 y §13.5 punto 4.
 *
 * Igual que `EditorialModule`, es deliberadamente VACÍO de providers: no tiene
 * lógica propia. Existe para que su controller pueda depender a la vez de
 * `AdministrationModule` (identidad del Incremento 2) y de `EducationModule`
 * (dueño de las tablas agregadas) sin crear un ciclo.
 *
 * Es un módulo SEPARADO de `EditorialModule` a propósito: §13.5 punto 4 exige
 * comprobar que "el módulo de la matriz no expone ningún método HTTP distinto
 * de GET". `EditorialModule` expone las rutas de escritura de I3/I4, de modo
 * que solo un módulo propio hace ese criterio verificable.
 *
 * No importa `AuthModule` (sesión de estudiante) ni `InternalOpsModule` (clave
 * compartida), ni ningún módulo de PROGRESS/GAMIFICATION/PRIVACY/AI.
 */
@Module({
  imports: [AdministrationModule, EducationModule],
  controllers: [CoverageMatrixController],
})
export class CoverageMatrixModule {}
