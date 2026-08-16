-- ============================================================================
-- LEF Bloque VII -- Plataforma Editorial, Incremento 2.
-- "Actor administrativo, roles y autorización editorial."
--
-- Fuente contractual: docs/adr/LEF-BLOCK-VII-DEFINITION.md
--   §9.1  entidad de actor administrativo (separada de Account, sin hard-delete)
--   §9.2  roles V1: EXACTAMENTE AUTHOR y PUBLISHER
--   §9.3  registro de acceso append-only (ADMIN-002, "registro de accesos")
--   §9.5  modelo mínimo de token personal (DG-7): hash, emisión, expiración,
--         revocación, referencia a un único actor -- y NADA más
--   §11.4 DG-9: desactivación/revocación sin hard-delete; retención DIFERIDA
--   §12.2 frontera exacta del incremento
--
-- Migración ADITIVA PURA: crea dos enums, cuatro tablas y un trigger. NO toca
-- ninguna tabla, columna, enum, índice ni trigger preexistente. En particular
-- NO toca `account` (que no gana ningún campo de rol, decisión B), ni
-- `auth_session`, ni nada del Incremento 1 ya cerrado.
--
-- Ninguna tabla de este archivo tiene FK hacia `account` (invariante 6).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Enums.
-- ----------------------------------------------------------------------------
CREATE TYPE "admin_role" AS ENUM ('AUTHOR', 'PUBLISHER');

CREATE TYPE "admin_access_outcome" AS ENUM (
  'ACCEPTED',
  'REJECTED_UNKNOWN_TOKEN',
  'REJECTED_EXPIRED',
  'REJECTED_REVOKED',
  'REJECTED_ACTOR_INACTIVE'
);

-- ----------------------------------------------------------------------------
-- admin_actor -- identidad administrativa individual (§9.1).
-- Sin columnas de retención/anonimización: DG-9 difirió el número (§11.4).
-- ----------------------------------------------------------------------------
CREATE TABLE "admin_actor" (
  "id" UUID NOT NULL,
  "display_name" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "deactivated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "last_authenticated_at" TIMESTAMP(3),

  CONSTRAINT "admin_actor_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- admin_actor_role -- N:N actor<->rol (§9.2). Un actor puede tener ambos.
-- ----------------------------------------------------------------------------
CREATE TABLE "admin_actor_role" (
  "actor_id" UUID NOT NULL,
  "role" "admin_role" NOT NULL,
  "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_actor_role_pkey" PRIMARY KEY ("actor_id", "role")
);

ALTER TABLE "admin_actor_role"
  ADD CONSTRAINT "admin_actor_role_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "admin_actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- admin_actor_token -- credencial personal (§9.5, DG-7).
--
-- `token_hash` guarda el SHA-256 (hex) del token en claro. El valor en claro
-- NO tiene columna en ninguna tabla de esta migración -- por construcción, no
-- por convención: no existe dónde escribirlo.
--
-- UNIQUE sobre el hash: dos actores no pueden compartir credencial, y la
-- resolución token->actor del guard es una única búsqueda indexada por
-- igualdad exacta (imposible con bcrypt/argon2, que exigirían recorrer filas).
-- ----------------------------------------------------------------------------
CREATE TABLE "admin_actor_token" (
  "id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "token_hash" TEXT NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),

  CONSTRAINT "admin_actor_token_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_actor_token_token_hash_key" ON "admin_actor_token"("token_hash");
CREATE INDEX "admin_actor_token_actor_id_idx" ON "admin_actor_token"("actor_id");

ALTER TABLE "admin_actor_token"
  ADD CONSTRAINT "admin_actor_token_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "admin_actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- admin_access_log -- registro de acceso append-only (§9.3, ADMIN-002).
--
-- `actor_id` NULLABLE: un token desconocido no resuelve a ningún actor y ese
-- intento igualmente debe quedar registrado. Cuando resuelve, la FK RESTRICT
-- es la que hace que la base RECHACE borrar un actor referenciado
-- (invariante 23 / §13.2 punto 7) -- la atribución histórica es estructural,
-- no una política operativa.
--
-- No guarda el token en claro ni su hash: solo la referencia a la fila de
-- `admin_actor_token`.
-- ----------------------------------------------------------------------------
CREATE TABLE "admin_access_log" (
  "id" UUID NOT NULL,
  "actor_id" UUID,
  "token_id" UUID,
  "outcome" "admin_access_outcome" NOT NULL,
  "request_path" TEXT NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "admin_access_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_access_log_actor_id_occurred_at_idx" ON "admin_access_log"("actor_id", "occurred_at");

ALTER TABLE "admin_access_log"
  ADD CONSTRAINT "admin_access_log_actor_id_fkey"
  FOREIGN KEY ("actor_id") REFERENCES "admin_actor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Inmutabilidad del registro de acceso -- PostgreSQL como autoridad final.
--
-- Mismo patrón EXACTO que `enforce_student_response_immutable`
-- (20260802205740_progress_foundation/migration.sql:62-72) y
-- `enforce_ai_message_immutable`: función plpgsql + RAISE EXCEPTION en un
-- trigger BEFORE ... FOR EACH ROW.
--
-- Sin bypass: no hay flag, variable de sesión, rol privilegiado ni "modo
-- test" que permita saltárselo. Un registro de accesos que el propio sistema
-- pudiera reescribir no sería un registro de accesos.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION enforce_admin_access_log_immutable()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION
    'admin_access_log es append-only: % no está permitido (LEF Bloque VII, Incremento 2, invariante 10 / ADMIN-002)',
    TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER admin_access_log_immutable
  BEFORE UPDATE OR DELETE ON "admin_access_log"
  FOR EACH ROW
  EXECUTE FUNCTION enforce_admin_access_log_immutable();
