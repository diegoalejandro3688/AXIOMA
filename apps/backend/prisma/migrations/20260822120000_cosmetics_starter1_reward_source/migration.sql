-- COSMETICS-STARTER-1
-- Migración ADITIVA PURA: agrega un único valor nuevo al enum existente
-- `reward_source_entity_type` (SYSTEM_STARTER), para que los cosméticos
-- otorgados por el Starter Kit (`ensureStarterCosmetics`) tengan una
-- procedencia honesta en `inventory_item.acquisition_source_type`, distinta
-- de LEVEL/ACHIEVEMENT_UNLOCK/CHALLENGE_CLAIM (vías de recompensa real).
-- No toca ninguna tabla, columna, índice ni trigger existente.

ALTER TYPE "reward_source_entity_type" ADD VALUE 'SYSTEM_STARTER';
