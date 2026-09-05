/**
 * TITLES-V1 -- seed REPRODUCIBLE e IDEMPOTENTE de las 7 `title_definition`
 * congeladas (`titles-v1-catalog.ts`, TITLES_V1). Correr N veces produce el
 * MISMO estado: cero filas duplicadas (UNIQUE(titleKey) real), y detección
 * RUIDOSA (fail-closed) si una fila existente con el mismo `titleKey` ya
 * divergió de la definición congelada (displayText/lockedRequirementCopy
 * cambiado a mano) -- nunca la sobreescribe en silencio.
 *
 * `rarityClass`/`unlockSourceType` son String abiertos en el schema
 * (§16.17) pero Títulos V1 congela "sin rareza" como decisión de producto:
 * las 7 filas comparten EXACTAMENTE el mismo valor neutro para ambos
 * (`TITLE_V1_RARITY_CLASS`/`TITLE_V1_UNLOCK_SOURCE_TYPE`) -- ninguna
 * distinción visual entre títulos.
 *
 * NO crea RewardBundle/RewardGrant -- Títulos V1 NUNCA pasa por ese
 * mecanismo (ver ADR, AccountTitle es la propia frontera de idempotencia
 * de ownership). NO otorga ningún AccountTitle -- eso es
 * `titles:reconcile-v1` (evaluación retroactiva) o el worker en vivo.
 *
 * Uso:
 *   pnpm --filter @axioma/backend titles:seed-v1            (crea/verifica)
 *   pnpm --filter @axioma/backend titles:seed-v1 -- --dry-run   (solo valida, no escribe)
 */
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { TitleDefinitionRepository } from '../src/gamification/title-definition.repository';
import { TITLES_V1 } from '../src/gamification/titles-v1-catalog';
import type { PrismaService } from '../src/platform/prisma/prisma.service';

export const TITLE_V1_RARITY_CLASS = 'prestige';
export const TITLE_V1_UNLOCK_SOURCE_TYPE = 'titles-v1-threshold';

export interface SeedTitlesResult {
  created: number;
  verified: number;
}

export async function seedTitlesV1({ dryRun }: { dryRun: boolean }): Promise<SeedTitlesResult> {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter }) as unknown as PrismaService;

  try {
    const titleDefinitionRepo = new TitleDefinitionRepository(prisma);

    console.log(`=== TITLES-V1 -- seed ${dryRun ? '(DRY RUN, no escribe)' : ''} ===\n`);

    if (TITLES_V1.length !== 7) throw new Error(`TITLES_V1 debe tener exactamente 7 entradas, tiene ${TITLES_V1.length}.`);

    let created = 0;
    let verified = 0;

    for (const entry of TITLES_V1) {
      const existing = await titleDefinitionRepo.findByTitleKey(entry.titleKey);
      if (existing) {
        if (existing.displayText !== entry.displayText || existing.description !== entry.lockedRequirementCopy) {
          throw new Error(
            `title_definition "${entry.titleKey}" ya existe pero DIVERGE del catálogo congelado ` +
              `(displayText/description en DB no coincide con TITLES_V1). Conflicto -- revisar manualmente, no se sobreescribe.`,
          );
        }
        if (existing.rarityClass !== TITLE_V1_RARITY_CLASS || existing.unlockSourceType !== TITLE_V1_UNLOCK_SOURCE_TYPE) {
          throw new Error(`title_definition "${entry.titleKey}" ya existe pero rarityClass/unlockSourceType no coincide con el seed V1.`);
        }
        if (existing.visibilityStatus !== 'PUBLIC' || existing.status !== 'ACTIVE') {
          throw new Error(`title_definition "${entry.titleKey}" ya existe pero visibilityStatus/status no es PUBLIC/ACTIVE.`);
        }
        console.log(`  =  ya existe, sin cambios: "${entry.titleKey}" (${entry.displayText})`);
        verified++;
        continue;
      }

      console.log(`  +  crea: "${entry.titleKey}" (${entry.displayText})`);
      if (!dryRun) {
        await titleDefinitionRepo.create({
          titleKey: entry.titleKey,
          displayText: entry.displayText,
          description: entry.lockedRequirementCopy,
          rarityClass: TITLE_V1_RARITY_CLASS,
          unlockSourceType: TITLE_V1_UNLOCK_SOURCE_TYPE,
          visibilityStatus: 'PUBLIC',
        });
      }
      created++;
    }

    console.log(`\n=== RESUMEN: ${created} creada(s), ${verified} ya existente(s) (verificada(s) sin divergencia) ===`);
    return { created, verified };
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');
  seedTitlesV1({ dryRun }).catch((error) => {
    console.error(`ERROR: ${error.message ?? error}`);
    process.exit(1);
  });
}
