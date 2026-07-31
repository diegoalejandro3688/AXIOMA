import { Controller, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  /**
   * Parte síncrona de la eliminación coordinada (ver ADR-0004/0005). El
   * cierre definitivo a los 30 días lo ejecuta el barrido programado, no
   * este endpoint. Reemplaza a POST /auth/account/deletion (movido aquí
   * porque PRIVACY, no AUTH, es quien coordina la eliminación).
   */
  @Post('account-deletion')
  @UseGuards(AuthGuard)
  @HttpCode(202)
  async requestAccountDeletion(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.privacyService.requestAccountDeletion(request.accountId);
  }

  /**
   * Disparo manual de los barridos (cierre definitivo + limpieza de
   * sesiones vencidas). Seguro de invocar repetidamente -- pensado para
   * operar sin esperar al cron, y para pruebas/CI.
   *
   * NOTA (ver ADR-0005): protegido solo por una clave estática compartida
   * (INTERNAL_OPS_KEY). Es infraestructura temporal de Fase 0, no una
   * solución de producción -- antes de cualquier despliegue con tráfico
   * real hace falta reemplazarla por autenticación real de operador
   * (ej. cuenta administrativa con su propio login) o retirar el endpoint
   * y dejar solo el cron + el CLI.
   *
   * La recuperación de cuentas (cancelDeletion) NO tiene endpoint HTTP --
   * ver src/cli/recover-account.ts.
   */
  @Post('_internal/sweep')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async runSweeps() {
    const deletion = await this.privacyService.runAccountDeletionSweep();
    const sessions = await this.privacyService.runSessionCleanupSweep();
    return { deletion, sessions };
  }
}
