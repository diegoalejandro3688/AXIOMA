import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UserController } from './user.controller';
import { UserProfileRepository } from './user-profile.repository';
import { UserService } from './user.service';

@Module({
  imports: [AuthModule],
  controllers: [UserController],
  providers: [UserProfileRepository, UserService],
  exports: [UserService],
})
export class UserModule {}
