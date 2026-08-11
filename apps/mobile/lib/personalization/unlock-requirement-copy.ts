import type { UnlockRequirement } from '@axioma/contracts';

/**
 * LEF Bloque V, Incremento 6/8 (docs/adr/LEF-BLOCK-V-DEFINITION.md §14) --
 * formateo de PRESENTACIÓN puro sobre un `UnlockRequirement` YA estructurado
 * por el backend (`reward_bundle_item` -> nivel/logro/desafío, sin
 * reinterpretación). Este módulo NUNCA decide si algo está bloqueado ni
 * inventa un requisito -- solo traduce los campos ya recibidos a un texto
 * legible, mismo criterio que `describePositionCardEmptyState` (lógica pura,
 * sin runtime de React Native, gateable con `tsx`).
 */
export function describeUnlockRequirement(requirement: UnlockRequirement): string {
  switch (requirement.source) {
    case 'LEVEL':
      return `Alcanza el nivel ${requirement.levelNumber}`;
    case 'ACHIEVEMENT':
      return `Desbloquea el logro "${requirement.achievementName}"`;
    case 'CHALLENGE':
      return `Completa el desafío "${requirement.challengeName}"`;
  }
}

/** Primer requisito como resumen corto (una línea) -- el listado completo se muestra aparte cuando hay más de uno. */
export function describeUnlockRequirements(requirements: UnlockRequirement[]): string {
  return requirements.map(describeUnlockRequirement).join(' • ');
}
