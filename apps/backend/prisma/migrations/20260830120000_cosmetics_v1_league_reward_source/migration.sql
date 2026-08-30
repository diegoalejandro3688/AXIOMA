-- COSMETICS-V1
-- Migración ADITIVA PURA: agrega un único valor nuevo al enum existente
-- `reward_source_entity_type` (LEAGUE), para que los marcos de liga
-- entregados al inscribirse por primera vez en un tier tengan una
-- procedencia honesta en `reward_grant.source_entity_type` /
-- `inventory_item.acquisition_source_type`, distinta de
-- LEVEL/ACHIEVEMENT_UNLOCK/CHALLENGE_CLAIM/SYSTEM_STARTER.
--
-- `source_entity_id` para esta fuente = `league_definition.id` (identidad
-- estable del reward por liga, independiente de la temporada;
-- `idempotency_key = reward:LEAGUE:{league_definition_id}`).
--
-- No toca ninguna tabla, columna, índice ni trigger existente. Mismo patrón
-- exacto que 20260822120000_cosmetics_starter1_reward_source.

ALTER TYPE "reward_source_entity_type" ADD VALUE 'LEAGUE';
