import { Module } from '@nestjs/common';
import { AdministrationController } from './administration.controller';
import { AdminActorRepository } from './admin-actor.repository';
import { AdminTokenRepository } from './admin-token.repository';
import { AdminAccessLogRepository } from './admin-access-log.repository';
import { AdminIdentityService } from './admin-identity.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminRoleGuard } from './admin-role.guard';

/**
 * Dominio ADMINISTRATION -- LEF Bloque VII, Incremento 2.
 *
 * Este módulo NO importa `AuthModule` ni ningún módulo de EDUCATION,
 * PROGRESS, GAMIFICATION, PRIVACY o AI. Su única dependencia es
 * `PrismaModule` (global), a través de sus propios repositorios.
 *
 * En particular NO importa `InternalOpsModule`: la identidad administrativa
 * no comparte ni un byte con la clave compartida de operación interna.
 */
@Module({
  controllers: [AdministrationController],
  providers: [
    AdminActorRepository,
    AdminTokenRepository,
    AdminAccessLogRepository,
    AdminIdentityService,
    AdminAuthGuard,
    AdminRoleGuard,
  ],
  exports: [AdminIdentityService, AdminAuthGuard, AdminRoleGuard],
})
export class AdministrationModule {}
