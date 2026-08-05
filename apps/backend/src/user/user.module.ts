import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UserController } from './user.controller';
import { UserProfileRepository } from './user-profile.repository';
import { PublicProfileRepository } from './public-profile.repository';
import { PublicProfileController } from './public-profile.controller';
import { CosmeticEquipmentController } from './cosmetic-equipment.controller';
import { UserService } from './user.service';

/**
 * `UserProfile` (privado, ADR-0008) y `PublicProfile` (identidad pública,
 * ADR-0018) conviven en el mismo módulo -- ambas son USER, mismo dominio
 * de Data Model (Bloque 6), gestionadas por el mismo `UserService`.
 *
 * Importa `GamificationModule` para `TitleEquipmentService` (3.b) y
 * `CosmeticEquipmentService` (5.b, BLOCK-III-DEFINITION.md §4.20) --
 * mismo criterio de frontera que `PrivacyModule` importando `UserModule`:
 * se llama al servicio del dominio dueño de los datos, nunca se inyecta un
 * repositorio ajeno directamente. `CosmeticEquipmentController` vive aquí
 * (path `gamification/me/cosmetics`) precisamente para evitar que
 * `GamificationModule` tuviera que importar `UserModule` de vuelta
 * (dependencia circular) solo para resolver `public_profile`.
 */
@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [UserController, PublicProfileController, CosmeticEquipmentController],
  providers: [UserProfileRepository, PublicProfileRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
