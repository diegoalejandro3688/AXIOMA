import { Module } from '@nestjs/common';
import { AdministrationController } from './administration.controller';
import { AdminActorRepository } from './admin-actor.repository';
import { AdminTokenRepository } from './admin-token.repository';
import { AdminAccessLogRepository } from './admin-access-log.repository';
import { AdminActionRepository } from './admin-action.repository';
import { AdminCms018ExceptionRepository } from './admin-cms018-exception.repository';
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
    // Incremento 3 -- registro de ACCIÓN editorial y activación de la
    // excepción de CMS-018. Se exportan para que el dominio EDUCATION, que es
    // la autoridad de publicación (invariante 15), escriba la auditoría dentro
    // de su propia transacción.
    AdminActionRepository,
    AdminCms018ExceptionRepository,
    AdminIdentityService,
    AdminAuthGuard,
    AdminRoleGuard,
  ],
  exports: [
    AdminIdentityService,
    AdminAuthGuard,
    AdminRoleGuard,
    AdminActionRepository,
    AdminCms018ExceptionRepository,
  ],
})
export class AdministrationModule {}
