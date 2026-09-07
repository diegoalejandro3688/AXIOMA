-- PS-0C.2 (Increment A) -- nuevo valor de enum, aislado en su propia
-- migración (mismo criterio que STABILIZATION-B6A): `ALTER TYPE ... ADD VALUE`
-- no puede usarse en la misma transacción en la que se agrega. Ningún valor
-- existente se toca, sin backfill. `IF NOT EXISTS` -> re-ejecución segura.
ALTER TYPE "profile_username_change_reason" ADD VALUE IF NOT EXISTS 'MODERATION_RESET';
