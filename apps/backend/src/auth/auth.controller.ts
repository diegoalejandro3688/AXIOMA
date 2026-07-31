import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  CreateSessionResponse,
  MeResponse,
  createSessionRequestSchema,
  createSessionResponseSchema,
  meResponseSchema,
} from '@axioma/contracts';
import { AuthService } from './auth.service';
import { AuthGuard, type AuthenticatedRequest } from './auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Único endpoint que crea o vincula cuentas. Limitado por rate limiting
   * (NFR-SEC-007) -- ver decorador Throttle.
   */
  @Post('session')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  async createSession(@Body() body: unknown): Promise<CreateSessionResponse> {
    const { idToken } = createSessionRequestSchema.parse(body);
    const result = await this.authService.createSession(idToken);
    return createSessionResponseSchema.parse(result);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  getMe(@Req() request: AuthenticatedRequest): MeResponse {
    return meResponseSchema.parse({
      accountId: request.accountId,
      status: request.accountStatus,
    });
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.authService.logout(request.sessionId);
  }

  /**
   * Parte síncrona de la eliminación coordinada (ver ADR-0004). El job que
   * a los 30 días ejecuta el borrado definitivo pertenece a Privacy
   * Foundation, no a este endpoint.
   */
  @Post('account/deletion')
  @UseGuards(AuthGuard)
  @HttpCode(202)
  async requestDeletion(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.authService.requestAccountDeletion(request.accountId);
  }
}
