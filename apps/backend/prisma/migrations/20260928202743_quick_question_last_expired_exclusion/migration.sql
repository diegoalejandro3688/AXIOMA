-- RC (Quick Question timeout exclusion fix) -- columna ADITIVA nullable,
-- sin relacion FK. Corrige una asimetria real: el camino de seguridad
-- inline de `/next` (cuando descubre una pregunta pendiente ya vencida)
-- excluye correctamente esa pregunta de la MISMA seleccion; el camino
-- normal/esperado (`/timeout` explicito, que limpia `currentQuestionVersionId`
-- por separado) no dejaba ningun rastro de "esto expiro", asi que una
-- llamada POSTERIOR a `/next` podia volver a servir la MISMA pregunta que
-- acababa de expirar. Ver QuickQuestionService.next()/.timeout().
ALTER TABLE "quick_question_session" ADD COLUMN "last_expired_question_version_id" UUID;
