import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { AdsConfigController } from './ads-config.controller';
import { AdsConfigService } from './ads-config.service';

/**
 * ADS V1 -- ADS-1B. Modulo de configuracion remota de anuncios.
 *
 * Importa SOLO infraestructura compartida (`AuthModule` para `AuthGuard`,
 * `ConfigModule`) y el modulo transversal de authorization (`EntitlementModule`,
 * que exporta `EntitlementService`). Sin dominio de negocio, sin base de datos,
 * sin ciclos.
 */
@Module({
  imports: [AuthModule, ConfigModule, EntitlementModule],
  controllers: [AdsConfigController],
  providers: [AdsConfigService],
})
export class AdsModule {}
