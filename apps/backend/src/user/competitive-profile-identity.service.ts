import { Injectable } from '@nestjs/common';
import { PublicProfileRepository } from './public-profile.repository';
import { EquippedTitleRepository } from '../gamification/equipped-title.repository';
import { EquippedCosmeticRepository } from '../gamification/equipped-cosmetic.repository';
import { XpBalanceRepository } from '../gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../gamification/level-definition.repository';
import { AchievementUnlockRepository } from '../gamification/achievement-unlock.repository';
import type { PublicProfile, LevelDefinition, EquippedCosmetic } from '../generated/prisma/client';

export interface PublicAchievementSummary {
  achievementKey: string;
  name: string;
  unlockedAt: Date;
}

export interface EquippedTitleSummary {
  titleKey: string;
  displayText: string;
  rarityClass: string;
}

export interface EquippedCosmeticSummary {
  cosmeticSlot: EquippedCosmetic['cosmeticSlot'];
  itemKey: string;
  name: string;
  assetReference: string;
}

export interface CompetitiveProfileIdentity {
  accountId: string;
  username: string;
  avatar: string | null;
  equippedTitle: EquippedTitleSummary | null;
  equippedCosmetics: EquippedCosmeticSummary[];
  levelNumber: number;
  publicAchievements: PublicAchievementSummary[];
}

export type PresentableProfile = { presentable: true; identity: CompetitiveProfileIdentity } | { presentable: false };

function isPresentable(profile: PublicProfile): boolean {
  return profile.lifecycleStatus === 'ACTIVE' && profile.visibilityStatus === 'VISIBLE';
}

function resolveLevelNumber(lifetimeXp: number, levels: LevelDefinition[]): number {
  // Invariante ya garantizada por el seed de Bloque II: siempre existe al
  // menos un nivel ACTIVO con minimumLifetimeXp = 0 (nivel 1) -- mismo
  // cálculo que ProgressionService.getLevelProgress, sin duplicar su lectura
  // de xp_balance (aquí ya viene resuelta por el llamador, individual o en
  // lote).
  let levelNumber = levels[0]?.levelNumber ?? 1;
  for (const level of levels) {
    if (level.minimumLifetimeXp <= lifetimeXp) {
      levelNumber = level.levelNumber;
    } else {
      break;
    }
  }
  return levelNumber;
}

/**
 * Bloque IV, Incremento 3, sub-incremento 3.a (ADR-0021 §2/§3) --
 * resuelve EXCLUSIVAMENTE presentabilidad + identidad de la lista blanca
 * (username, avatar, título/cosméticos equipados, nivel derivado, logros
 * públicos). Deliberadamente SIN contexto competitivo (`rankPosition`,
 * `metricValue`, liga/temporada) -- precisión obligatoria del Product
 * Owner (2026-08-06): separar esta resolución del contexto competitivo
 * para que un llamador que ya conoce el contexto (ej. una fila de
 * `leaderboard_entry` ya calculada, sub-incremento 3.c) nunca pague el
 * costo de volver a consultar `season_league_participation`/
 * `leaderboard_entry` solo para decidir si una fila es presentable. El
 * contexto competitivo, cuando haga falta (sub-incremento 3.b, consulta
 * directa de un perfil sin fila de ranking ya en mano), se resuelve en
 * una capa separada, nunca aquí.
 *
 * Vive en `UserModule` -- nunca en `GamificationModule` (ADR-0021 §4,
 * Decision Gate 7: ningún archivo de `src/gamification/` importa de
 * `src/user/`). Inyecta repositorios de GAMIFICATION ya exportados por
 * `GamificationModule`, mismo patrón que otras lecturas cross-dominio ya
 * existentes en este módulo.
 */
@Injectable()
export class CompetitiveProfileIdentityService {
  constructor(
    private readonly publicProfileRepo: PublicProfileRepository,
    private readonly equippedTitleRepo: EquippedTitleRepository,
    private readonly equippedCosmeticRepo: EquippedCosmeticRepository,
    private readonly xpBalanceRepo: XpBalanceRepository,
    private readonly levelDefinitionRepo: LevelDefinitionRepository,
    private readonly achievementUnlockRepo: AchievementUnlockRepository,
  ) {}

  /** Resolución individual -- delega en la versión de lote para no duplicar la lógica de ensamblado. */
  async resolveByAccountId(accountId: string): Promise<PresentableProfile> {
    const results = await this.resolveManyByAccountIds([accountId]);
    return results.get(accountId) ?? { presentable: false };
  }

  /**
   * Resolución por lote -- UNA sola consulta por tabla involucrada,
   * `WHERE account_id/public_profile_id IN (...)`, nunca una consulta por
   * cuenta (precisión obligatoria del Product Owner, evita el patrón N+1
   * al presentar una lista de ranking completa). Cuentas sin `public_profile`
   * o no presentables se omiten de las consultas de detalle (título,
   * cosméticos, XP, logros) -- ese costo nunca se paga para una fila que
   * de todos modos va a redactarse.
   */
  async resolveManyByAccountIds(accountIds: string[]): Promise<Map<string, PresentableProfile>> {
    const result = new Map<string, PresentableProfile>();
    if (accountIds.length === 0) return result;

    const profiles = await this.publicProfileRepo.findManyByAccountIds(accountIds);
    const presentableProfiles = profiles.filter(isPresentable);

    for (const accountId of accountIds) {
      result.set(accountId, { presentable: false });
    }
    if (presentableProfiles.length === 0) return result;

    const publicProfileIds = presentableProfiles.map((p) => p.id);
    const presentableAccountIds = presentableProfiles.map((p) => p.accountId);

    const [equippedTitles, equippedCosmetics, balances, levels, publicUnlocks] = await Promise.all([
      this.equippedTitleRepo.findManyByPublicProfileIds(publicProfileIds),
      this.equippedCosmeticRepo.findManyByPublicProfileIds(publicProfileIds),
      this.xpBalanceRepo.findManyByAccountIds(presentableAccountIds),
      this.levelDefinitionRepo.findAllActiveOrderedByLevelNumber(),
      this.achievementUnlockRepo.findManyPublicByAccountIds(presentableAccountIds),
    ]);

    const titleByProfileId = new Map(equippedTitles.map((t) => [t.publicProfileId, t]));
    const cosmeticsByProfileId = new Map<string, typeof equippedCosmetics>();
    for (const cosmetic of equippedCosmetics) {
      const list = cosmeticsByProfileId.get(cosmetic.publicProfileId) ?? [];
      list.push(cosmetic);
      cosmeticsByProfileId.set(cosmetic.publicProfileId, list);
    }
    const balanceByAccountId = new Map(balances.map((b) => [b.accountId, b]));
    const achievementsByAccountId = new Map<string, typeof publicUnlocks>();
    for (const unlock of publicUnlocks) {
      const list = achievementsByAccountId.get(unlock.accountId) ?? [];
      list.push(unlock);
      achievementsByAccountId.set(unlock.accountId, list);
    }

    for (const profile of presentableProfiles) {
      const equippedTitle = titleByProfileId.get(profile.id);
      const lifetimeXp = balanceByAccountId.get(profile.accountId)?.lifetimeXp ?? 0;
      const identity: CompetitiveProfileIdentity = {
        accountId: profile.accountId,
        username: profile.usernameNormalized,
        avatar: profile.avatarReference,
        equippedTitle: equippedTitle
          ? {
              titleKey: equippedTitle.accountTitle.titleDefinition.titleKey,
              displayText: equippedTitle.accountTitle.titleDefinition.displayText,
              rarityClass: equippedTitle.accountTitle.titleDefinition.rarityClass,
            }
          : null,
        equippedCosmetics: (cosmeticsByProfileId.get(profile.id) ?? []).map((c) => ({
          cosmeticSlot: c.cosmeticSlot,
          itemKey: c.inventoryItem.cosmeticItem.itemKey,
          name: c.inventoryItem.cosmeticItem.name,
          assetReference: c.inventoryItem.cosmeticItem.assetReference,
        })),
        levelNumber: resolveLevelNumber(lifetimeXp, levels),
        publicAchievements: (achievementsByAccountId.get(profile.accountId) ?? []).map((u) => ({
          achievementKey: u.achievementDefinition.achievementKey,
          name: u.achievementDefinition.name,
          unlockedAt: u.unlockedAt,
        })),
      };
      result.set(profile.accountId, { presentable: true, identity });
    }

    return result;
  }
}
