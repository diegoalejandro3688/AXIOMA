import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Defensa operativa interna contra exposición de coste -- ver
 * docs/adr/LEF-BLOCK-VI-DEFINITION.md §22 (revisión, Incremento 3). NO es un
 * presupuesto comercial en USD (fuera de alcance de este incremento) -- es
 * un interruptor booleano que, cuando está activo, bloquea TODA generación
 * nueva del Tutor IA con una degradación controlada (503, cero consumo,
 * mensaje USER sigue persistido y reintentable), sin tocar ningún otro
 * dominio de Axioma (Estudio/Competir no dependen de `AiModule`).
 *
 * Estado en memoria, no persistido -- se inicializa desde `AI_GENERATION_DISABLED`
 * (env, default `false`) al arrancar el proceso, y puede alternarse en caliente
 * vía `AiInternalAdminController` (protegido por `InternalOpsGuard`, rechazado
 * en producción) -- mismo criterio que `AiEntitlementService.testOnlyTierOverride`.
 * Un despliegue real activaría el corte reiniciando con
 * `AI_GENERATION_DISABLED=true`; el endpoint interno existe para que el gate
 * pueda demostrar el comportamiento sin reiniciar el proceso.
 */
@Injectable()
export class AiCircuitBreakerService {
  private disabled: boolean;

  constructor(config: ConfigService) {
    this.disabled = config.get<string>('AI_GENERATION_DISABLED', 'false') === 'true';
  }

  isGenerationDisabled(): boolean {
    return this.disabled;
  }

  /** Solo para uso de `AiInternalAdminController` (gate/desarrollo/operación) -- ver docstring de la clase. */
  setGenerationDisabled(disabled: boolean): void {
    this.disabled = disabled;
  }
}
