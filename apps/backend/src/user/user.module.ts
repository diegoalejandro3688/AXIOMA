import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './user.controller';
import { UserProfileRepository } from './user-profile.repository';
import { PublicProfileRepository } from './public-profile.repository';
import { PublicProfileController } from './public-profile.controller';
import { UserService } from './user.service';

/**
 * `UserProfile` (privado, ADR-0008) y `PublicProfile` (identidad pública,
 * ADR-0018) conviven en el mismo módulo -- ambas son USER, mismo dominio
 * de Data Model (Bloque 6), gestionadas por el mismo `UserService`.
 */
@Module({
  imports: [AuthModule],
  controllers: [UserController, PublicProfileController],
  providers: [UserProfileRepository, PublicProfileRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
