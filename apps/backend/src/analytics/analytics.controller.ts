import { Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { InternalOpsGuard } from '../platform/internal-ops/internal-ops.guard';
import { AnalyticsService } from './analytics.service';

const DEFAULT_SUMMARY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * Disparo manual del relay (outbox_event -> analytics_event). Mismo
   * criterio de riesgo que POST /privacy/_internal/sweep (ADR-0005):
   * infraestructura temporal de Fase 0, protegida solo por INTERNAL_OPS_KEY.
   */
  @Post('_internal/relay')
  @UseGuards(InternalOpsGuard)
  @HttpCode(200)
  async runRelay() {
    return this.analyticsService.ingestPending();
  }

  /**
   * "Dashboard inicial" de la Fase 0 (Implementation Matrix v1.1): un
   * endpoint JSON de conteos por eventKey, no una UI -- ver ADR-0006. Una
   * UI visual real es responsabilidad del dominio Administration, fuera de
   * alcance de este paso.
   */
  @Get('_internal/summary')
  @UseGuards(InternalOpsGuard)
  async getSummary(@Query('sinceHours') sinceHours?: string) {
    const windowMs = sinceHours ? Number(sinceHours) * 60 * 60 * 1000 : DEFAULT_SUMMARY_WINDOW_MS;
    const since = new Date(Date.now() - windowMs);
    const totalsByEventKey = await this.analyticsService.summarySince(since);
    return { since: since.toISOString(), totalsByEventKey };
  }
}
