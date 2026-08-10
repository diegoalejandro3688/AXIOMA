import { Injectable } from '@nestjs/common';
import { PublicProfileRepository } from './public-profile.repository';
import { EquippedTitleRepository } from '../gamification/equipped-title.repository';
import { EquippedCosmeticRepository } from '../gamification/equipped-cosmetic.repository';
import { XpBalanceRepository } from '../gamification/xp-balance.repository';
import { LevelDefinitionRepository } from '../gamification/level-definition.repository';
import { AchievementUnlockRepository } from '../gamification/achievement-unlock.repository';
import { FeaturedAchievementRepository } from '../gamification/featured-achievement.repository';
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
  banner: string | null;
  equippedTitle: EquippedTitleSummary | null;
  equippedCosmetics: EquippedCosmeticSummary[];
  levelNumber: number;
  publicAchievements: PublicAchievementSummary[];
  /** LEF Bloque V, Incremento 2 -- subconjunto curado (0-3) de `publicAchievements`, ver docs/adr/LEF-BLOCK-V-DEFINITION.md §10. */
  featuredAchievements: PublicAchievementSummary[];
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
    private readonly featuredAchievementRepo: FeaturedAchievementRepository,
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

    const identities = await this.assembleIdentitiesForProfiles(presentableProfiles);
    for (const [accountId, identity] of identities) {
      result.set(accountId, { presentable: true, identity });
    }

    return result;
  }

  /**
   * Ensambla la identidad de UNA cuenta SIN comprobar presentabilidad --
   * uso EXCLUSIVO de la autoconsulta (`/me`, sub-incremento 3.b): el
   * dueño de un perfil siempre ve su propia identidad completa, sin
   * importar `visibilityStatus` (ADR-0020 §2) ni, según la precisión del
   * Product Owner sobre 3.b, `lifecycleStatus = RETIRED`. El llamador
   * (`UserService`) es quien decide QUÉ cuentas califican para esto
   * (existe el perfil, no está `ANONYMIZED`) -- este método nunca aplica
   * el filtro de presentabilidad pública, a propósito.
   */
  async assembleIdentityForOwnAccount(accountId: string): Promise<CompetitiveProfileIdentity | null> {
    const profile = await this.publicProfileRepo.findByAccountId(accountId);
    if (!profile) return null;
    const identities = await this.assembleIdentitiesForProfiles([profile]);
    return identities.get(accountId) ?? null;
  }

  /**
   * Ensamblado compartido -- UNA sola consulta por tabla, `WHERE ... IN
   * (...)`, para el conjunto de perfiles ya decidido por el llamador (ya
   * sea "los presentables de un lote" o "el propio, sin filtrar"). Nunca
   * vuelve a consultar `public_profile` -- ya lo recibe resuelto.
   */
  private async assembleIdentitiesForProfiles(profiles: PublicProfile[]): Promise<Map<string, CompetitiveProfileIdentity>> {
    const result = new Map<string, CompetitiveProfileIdentity>();
    if (profiles.length === 0) return result;

    const publicProfileIds = profiles.map((p) => p.id);
    const accountIds = profiles.map((p) => p.accountId);

    const [equippedTitles, equippedCosmetics, balances, levels, publicUnlocks, featured] = await Promise.all([
      this.equippedTitleRepo.findManyByPublicProfileIds(publicProfileIds),
      this.equippedCosmeticRepo.findManyByPublicProfileIds(publicProfileIds),
      this.xpBalanceRepo.findManyByAccountIds(accountIds),
      this.levelDefinitionRepo.findAllActiveOrderedByLevelNumber(),
      this.achievementUnlockRepo.findManyPublicByAccountIds(accountIds),
      this.featuredAchievementRepo.findManyPublicByPublicProfileIds(publicProfileIds),
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
    const featuredByProfileId = new Map<string, typeof featured>();
    for (const row of featured) {
      const list = featuredByProfileId.get(row.publicProfileId) ?? [];
      list.push(row);
      featuredByProfileId.set(row.publicProfileId, list);
    }

    for (const profile of profiles) {
      const equippedTitle = titleByProfileId.get(profile.id);
      const lifetimeXp = balanceByAccountId.get(profile.accountId)?.lifetimeXp ?? 0;
      const profileCosmetics = cosmeticsByProfileId.get(profile.id) ?? [];
      // LEF Bloque V, Incremento 1 (docs/adr/LEF-BLOCK-V-DEFINITION.md §9;
      // enmienda ADR-0021 §2) -- el banner es el cosmético YA equipado en
      // el slot PROFILE_BANNER (Bloque III), sin consulta adicional ni
      // campo nuevo en public_profile. `null` es un campo vacío legítimo
      // (sin banner equipado), no una redacción -- mismo criterio que
      // `equippedTitle: null`.
      const bannerCosmetic = profileCosmetics.find((c) => c.cosmeticSlot === 'PROFILE_BANNER');
      const identity: CompetitiveProfileIdentity = {
        accountId: profile.accountId,
        username: profile.usernameNormalized,
        avatar: profile.avatarReference,
        banner: bannerCosmetic?.inventoryItem.cosmeticItem.assetReference ?? null,
        equippedTitle: equippedTitle
          ? {
              titleKey: equippedTitle.accountTitle.titleDefinition.titleKey,
              displayText: equippedTitle.accountTitle.titleDefinition.displayText,
              rarityClass: equippedTitle.accountTitle.titleDefinition.rarityClass,
            }
          : null,
        equippedCosmetics: profileCosmetics.map((c) => ({
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
        // Ya viene ordenado por displayOrder (findManyPublicByPublicProfileIds)
        // y ya re-filtrado ACTIVE+PUBLIC en la consulta -- sin trabajo adicional aquí.
        featuredAchievements: (featuredByProfileId.get(profile.id) ?? []).map((f) => ({
          achievementKey: f.achievementUnlock.achievementDefinition.achievementKey,
          name: f.achievementUnlock.achievementDefinition.name,
          unlockedAt: f.achievementUnlock.unlockedAt,
        })),
      };
      result.set(profile.accountId, identity);
    }

    return result;
  }
}
