-- Bloque IV, Incremento 4, sub-incremento 4.b -- precisión obligatoria del
-- Product Owner: V1 permite una sola QuickQuestionSession ACTIVE por
-- cuenta. Índice único parcial, mismo patrón que game_season_single_active
-- (20260805204859_league_season_foundation) salvo que aquí es POR CUENTA,
-- no global -- respaldo de base de datos independiente de la creación
-- idempotente bajo advisory lock que hace QuickQuestionService.openSession.
-- Sin representación declarativa en schema.prisma (Prisma no soporta
-- índices parciales en el DSL) -- mismo criterio ya aceptado para
-- game_season_single_active.
CREATE UNIQUE INDEX "quick_question_session_one_active_per_account" ON "quick_question_session" ("account_id") WHERE "status" = 'ACTIVE';
