-- STABILIZATION-B (Títulos V1) -- migración puramente ADITIVA: nuevo valor
-- de enum únicamente. Ningún valor existente se toca, sin backfill.
ALTER TYPE "reward_source_entity_type" ADD VALUE 'TITLE_UNLOCK';
