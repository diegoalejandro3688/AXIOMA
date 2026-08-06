import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { GamificationModule } from '../gamification/gamification.module';
import { UserController } from './user.controller';
import { UserProfileRepository } from './user-profile.repository';
import { PublicProfileRepository } from './public-profile.repository';
import { PublicProfileController } from './public-profile.controller';
import { CosmeticEquipmentController } from './cosmetic-equipment.controller';
import { UserService } from './user.service';
import { CompetitiveProfileIdentityService } from './competitive-profile-identity.service';

/**
 * `UserProfile` (privado, ADR-0008) y `PublicProfile` (identidad pública,
 * ADR-0018) conviven en el mismo módulo -- ambas son USER, mismo dominio
 * de Data Model (Bloque 6), gestionadas por el mismo `UserService`.
 *
 * Importa `GamificationModule` para `TitleEquipmentService` (3.b) y
 * `CosmeticEquipmentService` (5.b, BLOCK-III-DEFINITION.md §4.20) --
 * mismo criterio de frontera que `PrivacyModule` importando `UserModule`:
 * una ESCRITURA sobre datos ajenos (equipar un título/cosmético) pasa
 * siempre por el servicio del dominio dueño, nunca por su repositorio
 * directamente. Una LECTURA pura ya sigue el patrón contrario en este
 * mismo módulo (`GamificationModule` exporta repositorios de solo lectura
 * como `XpBalanceRepository`/`LeaderboardEntryRepository` para consumo
 * directo) -- `CompetitiveProfileIdentityService` (Bloque IV, Incremento 3,
 * sub-incremento 3.a, ADR-0021 §4) sigue ese mismo criterio: inyecta
 * repositorios de lectura de GAMIFICATION directamente, sin pasar por un
 * servicio intermedio que no existe para ese propósito.
 * `CosmeticEquipmentController` vive aquí (path `gamification/me/cosmetics`)
 * precisamente para evitar que `GamificationModule` tuviera que importar
 * `UserModule` de vuelta (dependencia circular) solo para resolver
 * `public_profile`.
 */
@Module({
  imports: [AuthModule, GamificationModule],
  controllers: [UserController, PublicProfileController, CosmeticEquipmentController],
  providers: [UserProfileRepository, PublicProfileRepository, UserService, CompetitiveProfileIdentityService],
  exports: [UserService, CompetitiveProfileIdentityService],
})
export class UserModule {}
