-- STABILIZATION-B6A (avatares históricos V1 por materia) -- migración
-- puramente ADITIVA: nuevo valor de enum únicamente. Ningún valor
-- existente se toca, sin backfill. Los 5 primeros avatares históricos
-- pasan de "completa una unidad" (STUDY_UNIT, superado) a "completa una
-- materia canónica completa" (STUDY_SUBJECT). `sourceEntityId` =
-- `{accountId}:{subjectKey}` (idempotencyKey =
-- `reward:STUDY_SUBJECT:{accountId}:{subjectKey}`).
ALTER TYPE "reward_source_entity_type" ADD VALUE 'STUDY_SUBJECT';
