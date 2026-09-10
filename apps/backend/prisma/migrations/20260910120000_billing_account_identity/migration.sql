-- PB-1A (Premium V1 -- Capa 3, Billing Account Identity) -- migracion
-- puramente ADITIVA: una columna nullable nueva + su indice unico. Ningun
-- valor existente se toca, sin backfill, sin operacion destructiva, sin
-- cambio de enum, sin tabla nueva. El backend actualmente desplegado
-- (f035a66) ignora por completo esta columna nullable.

-- AlterTable
ALTER TABLE "account" ADD COLUMN "obfuscated_account_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "account_obfuscated_account_id_key" ON "account"("obfuscated_account_id");
