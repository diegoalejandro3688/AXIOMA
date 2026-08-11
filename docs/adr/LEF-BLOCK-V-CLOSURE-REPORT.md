# LEF Block V Closure Report — Perfil Avanzado

**Fecha de cierre**: 2026-08-11
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: V de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/LEF-BLOCK-V-DEFINITION.md`, `docs/adr/0018-public-profile-foundation.md`, `docs/adr/0020-ranking-materializacion.md`, `docs/adr/0021-perfil-competitivo-cross-cuenta.md` (enmendado por Incrementos 1-2), `docs/adr/LEF-BLOCK-IV-CLOSURE-REPORT.md`
**Estado final**: **APPROVED**

**Nota de nomenclatura**: este reporte usa el prefijo `LEF-` porque `docs/adr/BLOCK-V-CLOSURE-REPORT.md` ya existe, perteneciente a un roadmap distinto y anterior (Fase 1 — Vertical Slice M1, "Bloque V de V") — ver `LEF-BLOCK-V-DEFINITION.md`, nota de nomenclatura inicial.

## 1. Objetivo

Definido formalmente en `LEF-BLOCK-V-DEFINITION.md` (§2): dar al estudiante una vista consolidada, verídica y controlable de sí mismo — quién es públicamente, qué ha logrado, cómo ha progresado, y qué de eso decide mostrar — sin introducir ninguna mecánica nueva de gamificación, ranking o cosméticos, y sin que la vista previa pública pueda mostrar algo distinto de lo que un tercero real vería.

## 2. Alcance contractual

Dentro de alcance (PRD §15, Master Context §4.12): encabezado de perfil consolidado (banner, avatar, título, nivel, liga, insignias destacadas), resumen académico privado, resumen de actividad privado, historial competitivo cross-temporada, personalización con elementos bloqueados y requisito real de desbloqueo, vista previa pública fiel, control de visibilidad granular de insignias destacadas, enmienda mínima de ADR-0021 para incluir `banner`.

Explícitamente fuera de alcance (§3, reafirmado en el cierre — ninguno se construyó, verificado por inspección en §15): economía de cosméticos, subida de avatar/banner por el usuario, nueva mecánica de XP/niveles/logros/títulos, cambios a las reglas de ranking (ADR-0020), herramientas de reporte/moderación, Tutor IA (Bloque VI) y Plataforma Editorial (Bloque VII).

## 3. Los 8 incrementos realizados

| # | Incremento | Contenido |
|---|---|---|
| 1 | Enmienda ADR-0021 — banner en whitelist pública | `banner` expuesto en `GET .../competitive-profile` y filas de ranking, derivado exclusivamente de `EquippedCosmetic` (slot `PROFILE_BANNER`). |
| 2 | Visibilidad granular — insignias destacadas | Tabla nueva `public_profile_featured_achievement` (única persistencia nueva de todo el bloque), máximo 3/mínimo 0, endpoint privado de selección/orden, trigger de conteo máximo. |
| 3 | Resumen académico privado | `GET /progress/me/summary` — agregación de solo lectura sobre `curriculum_topic_progress`/`student_response`, sin nuevo cálculo. |
| 4 | Historial competitivo cross-temporada | `GET /gamification/me/league/history` — lectura privada, sin excepción, de `SeasonLeagueParticipation`/`LeaderboardSnapshot` ya persistidos. |
| 5 | Vista consolidada de perfil propio | `GET /user/me/advanced-profile` — agregador puro de los Incrementos 1-4, reutiliza los serializers ya existentes. |
| 6 | Personalización con elementos bloqueados | `locked` en `GET /gamification/me/cosmetics`/`/me/titles`, requisito derivado de `reward_bundle_item` (misma cadena que `RewardEvaluationWorker`), sin migración. |
| 7 | Vista previa pública | `GET /user/public-profile/me/preview` — reutiliza el mismo camino de código (`getCompetitiveProfileByUsername`) que un tercero real, byte-idéntico. |
| 8 | Superficie móvil | `perfil/index.tsx` consolidado (agregador único), `perfil/preview.tsx`, personalización con locked, sin fetch duplicado. |

## 4. Commits por incremento

| Incremento | Commit |
|---|---|
| Definición | `ec20ea9fac92ced62ffdae26ad7c838c721b15dd` |
| 1 | `ffb338cf3cab07723884b2857c305f0fd480d5cc` |
| 2 | `267f63cd7fc2466c9410f4fd68028af4da5bffbe` |
| 3 | `920901b25f01696cab6f54753673495c114b7c8b` |
| 4 | `52cfd24d2fd49215b2872806029acba445a6995d` |
| 5 | `9751da769e1a9ed1a23ffb3834aababfd21fa293` |
| 6 | `e7d0d121d628f456a8b27f32d25f15e797cf8a59` |
| 7 | `a5c3cbdbf82682c267ab13ae8adda8b7d709d9d2` |
| 8 | `c2cfb7792ed11a66fe33f1dffd17286e232b225c` |

Historia lineal confirmada (`git log --oneline ec20ea9..c2cfb77`) — sin commits ajenos intercalados.

## 5. Decisiones de Product Owner

Todas las decisiones registradas en `LEF-BLOCK-V-DEFINITION.md` quedaron satisfechas, ninguna abierta al cierre:

- **§4.5** (privacidad del historial): PRIVADO sin excepción — verificado por gate (Incremento 4, "sin fuga a la superficie pública").
- **§4.6** (límite de insignias destacadas): máximo 3/mínimo 0, reforzado por trigger de base de datos — verificado (Incremento 2, gate del 4º elemento rechazado a nivel de trigger, no solo aplicación).
- **§4.8** (requisito de desbloqueo, Incremento 6): auditoría del catálogo real concluyó que el requisito **sí es derivable** de la cadena `reward_bundle_item → level_definition/achievement_version/challenge_definition` — sin migración, sin ADR nuevo. Corrección posterior del Product Owner sobre la semántica de `locked` (un elemento sin `unlockRequirement` real nunca aparece, `unlockRequirements: []` no es un estado expuesto) — implementada y gateada.
- **Fetch duplicado del Incremento 8**: aprobado usar `GET /user/me/advanced-profile` como fuente única; `CompetitiveProfileSection` convertida a componente de presentación pura.
- **Navegación de preview del Incremento 8**: aprobada como pantalla separada (`perfil/preview.tsx`), confirmado que `/perfil` conserva su identidad de tab.
- **Verificación práctica de cuenta poblada** (revisión final de Incremento 8): ejecutada reutilizando el patrón de fixtures de `verify-advanced-profile-gate.ts`, sin infraestructura nueva — ver §9.

## 6. Gates específicos por incremento

| Incremento | Gate | Estado |
|---|---|---|
| 1 | `verify:competitive-profile-endpoint-gate` (extendido, ADR-0021 Gate 3) | PASS |
| 2 | `verify:featured-achievement-gate` | PASS |
| 3 | `verify:academic-summary-gate` | PASS |
| 4 | `verify:competitive-history-gate` | PASS |
| 5 | `verify:advanced-profile-gate` | PASS |
| 6 | `verify:personalization-catalog-gate` | PASS |
| 7 | `verify:public-profile-preview-gate` | PASS |
| 8 | `verify:advanced-profile-mobile-gate` (nuevo) + `verify:competitive-profile-gate` (mobile, Bloque IV, actualizado sin pérdida de cobertura) | PASS |

Los siete Decision Gates de bloque (`LEF-BLOCK-V-DEFINITION.md` §5) están todos en PASS: ninguna regla de cálculo de Competir cambió (regresión ADR-0020 completa dentro de la cadena), ninguna mecánica nueva de Gamificación (verificación estática, solo lectura), sin economía de cosméticos, sin subida de archivos de usuario, vista previa byte-idéntica a la superficie pública real (Gate 5), sin herramientas de reporte/moderación, regresión consolidada LEF I-IV en PASS después de cada incremento.

## 7. Gate consolidado

`verify:lef-block-v-gate` (nuevo, `scripts/verify-lef-block-v-gate.mjs`) — orquestador, mismo criterio que `verify:lef-block-iv-gate`: invoca el gate consolidado del Bloque IV (LEF) completo (que a su vez invoca Bloque III, Bloque II, Bloque I y M1) como un solo paso, agrega los seis gates HTTP propios de los Incrementos 2-7 (cada uno con su propia instancia de backend) y el gate propio del Incremento 8 (mobile, sin backend).

```
Gate consolidado Bloque IV (LEF) -- M1+I+II+III+IV, incluye Incremento 1 y 8 de Bloque V transitivamente  PASS
Incremento 2 -- Insignias destacadas                                                                      PASS
Incremento 3 -- Resumen académico privado                                                                 PASS
Incremento 4 -- Historial competitivo cross-temporada                                                     PASS
Incremento 5 -- Vista consolidada de perfil propio                                                        PASS
Incremento 6 -- Personalización con elementos bloqueados                                                  PASS
Incremento 7 -- Vista previa pública                                                                      PASS
Incremento 8 -- Superficie móvil de Perfil Avanzado                                                       PASS

Gate consolidado Bloque V (LEF): PASS
```

`verify:learning-experience-foundation-gate` actualizado para invocar `verify-lef-block-v-gate.mjs` en vez de `verify-lef-block-iv-gate.mjs` — mismo criterio de alias fino ya usado al cerrar Bloque IV.

Ejecución real registrada el 2026-08-11: migraciones/seed ya aplicados, typecheck/lint recursivos (incluye `apps/mobile`) y build de contracts/backend (vía la base M1, un solo paso, sin duplicar), y toda la cadena de arriba — cada gate HTTP contra una instancia de backend recién iniciada (nunca reutilizada entre gates). **2635 líneas de log, cero ocurrencias de `FALLO`.**

## 8. Evidencia de backend/Postgres real

```
typecheck (repo completo, recursivo)                PASS
lint (repo completo, recursivo)                      PASS
build contracts                                       PASS
build backend                                          PASS
verify:lef-block-iv-gate (consolidado, M1-IV)         PASS
verify:featured-achievement-gate                       PASS
verify:academic-summary-gate                            PASS
verify:competitive-history-gate                          PASS
verify:advanced-profile-gate                               PASS
verify:personalization-catalog-gate                          PASS
verify:public-profile-preview-gate                              PASS
verify:lef-block-v-gate (consolidado, nuevo)                       PASS
verify:learning-experience-foundation-gate (alias actualizado)     PASS
```

Cada gate HTTP se corrió contra una instancia de backend real, recién iniciada (nunca reutilizada entre gates) — mismo criterio de aislamiento por proceso que todos los bloques anteriores. Incluye comparación byte a byte real (Incremento 7, preview vs. consulta pública de una segunda cuenta), fixtures con pipeline real de finalización de liga (`LeaderboardFinalizationService`, Incrementos 4/5), y triggers de base de datos ejercitados directamente (Incremento 2, conteo máximo de insignias).

## 9. Evidencia mobile real

```
tsc --noEmit (apps/mobile)                PASS
eslint (apps/mobile)                       PASS
verify:advanced-profile-mobile-gate (nuevo) PASS
verify:competitive-profile-gate (actualizado) PASS
verify:cosmetics-gate                          PASS
verify:leaderboard-gate                         PASS
verify:league-participation-gate                 PASS
verify:quick-question-gate                        PASS
verify:challenges-gate                             PASS
verify:offline-outbox-gate                          PASS
```

**Verificación práctica real** (no solo gates automatizados), en dos rondas:

1. Cuenta nueva real (registro + onboarding vía UI web, sesión real): render sin crash, estados vacíos correctos, navegación `/perfil` → `/perfil/preview` → `/perfil` confirmada (tab conserva identidad, back funciona), dark theme confirmado por tokens computados exactos.
2. Cuenta completamente poblada (fixture reutilizando el patrón de `verify-advanced-profile-gate.ts`, sesión real vía login UI): banner/marco/insignia equipados, título equipado, nivel, liga/rank en vivo, 2 de 3 insignias destacadas, resumen académico con actividad real (6/4/67%), historial competitivo real (temporada finalizada, posición #1), catálogo bloqueado con requisitos reales derivados de datos ya existentes — todo confirmado por inspección de red/DOM contra backend real. Limitación aceptada como no bloqueante: renderizado de píxel de imágenes no verificable sin URLs de assets HTTP reales (fixture usa `asset://` como el resto de gates del repo).

## 10. Incidencias reales encontradas durante el bloque

1. **Incremento 6 — semántica de `locked` corregida por el Product Owner**: la primera implementación exponía `unlockRequirements: []` como estado válido; corregido antes del cierre del incremento porque un requisito vacío no cumple PROFILE-004 ("requisito REAL"). Sin migración adicional.
2. **Incremento 7 — gate propio con falso negativo de comparación byte a byte**: la primera versión comparaba `raw` incluso para respuestas 404, que difieren por `requestId`/`timestamp` únicos por request; corregido a comparar `code`+`message`.
3. **Incremento 8 — dos efectos colaterales de tooling**: `expo start`/`expo install --check` modificaron `app.json` y dos scripts de `package.json` como side-effect; revertidos, nunca parte del commit.
4. **Incremento 8 — fixture de verificación práctica con fila huérfana**: un script temporal (nunca commiteado) dejó, en su primer intento fallido, una `season_league_participation` en `ACTIVE` que interfería con la resolución de "liga actual". Diagnosticado (causa: `findFirst` sin orden explícito sobre múltiples filas `ACTIVE`) y corregido con una transición de estado válida (`ACTIVE → SEASON_ENDED`, vía el trigger de dominio existente) — sin tocar código de producto.
5. **Rate limiting de `/auth/session` por proceso** (recurrente en todos los bloques desde IV): cada gate HTTP de este bloque corrió contra su propia instancia de backend, mismo criterio ya establecido.

Ninguna incidencia fue un defecto de dominio real no corregido — todas se resolvieron dentro del incremento correspondiente antes de su propio cierre, o (incidencia 4) durante la verificación práctica final sin tocar código.

## 11. Cómo se resolvieron

Ver detalle incidencia por incidencia en §10 — en todos los casos: diagnóstico contra evidencia real (logs, DB, comparación directa), corrección mínima y localizada, re-ejecución del gate afectado hasta PASS, sin expandir alcance.

## 12. Deferrals explícitos

Reafirmados sin cambio desde la definición del bloque (§3): economía de cosméticos (sin fecha ni bloque asignado), subida de avatar/banner por el usuario (Axioma sigue proveyendo assets ilustrados controlados), herramientas de reporte/moderación (decisión explícita del Product Owner, no es un sistema de moderación). Tiempo de estudio y ensayos/simulacros permanecen ausentes del resumen académico — gap de producto documentado desde el cierre del Incremento 3, sin fuente de dato real todavía, nunca fabricado.

## 13. Deuda técnica conocida que NO bloquea el cierre

- **`apps/backend/scripts/verify-public-profile-gate.ts`** instancia `UserService` manualmente con solo 4 de sus 8 argumentos reales (documentado en el cierre del Incremento 6) — deuda de tooling preexistente, no introducida por este bloque, el gate nunca invoca los métodos que dependerían de los servicios faltantes.
- **Residuo de datos sintéticos en la base de desarrollo**: los múltiples gates de este bloque (y la verificación práctica final) dejaron cuentas/perfiles/logros/cosméticos de prueba en la base de datos de **desarrollo** — mismo criterio de transparencia que Bloque IV (`LEF-BLOCK-IV-CLOSURE-REPORT.md` §7): inofensivo, sin efecto en producción, la base de desarrollo se sembrará de cero en cualquier entorno nuevo.
- **Ausencia de UI de reclamo de username/visibilidad en mobile**: gap preexistente de Bloque IV/ADR-0018 (nunca se construyó una pantalla dedicada), detectado durante la auditoría de este bloque pero explícitamente fuera de alcance del Incremento 8 (no estaba en su objetivo contractual) — el estado vacío correspondiente ("Configura tu nombre de usuario...") se conserva sin cambio.

## 14. Notas de trazabilidad sobre gates históricos de Bloques III/IV

- **Bloque IV, `verify-league-season-foundation-gate.ts` §18** (verifica textualmente que ningún controller importa `game_season`/`league_definition`/`season_league_participation` directamente): sigue en PASS literal sin haber sido tocado — `CompetitiveHistoryController` (Incremento 4) no importa esos repositorios directamente, solo `CompetitiveHistoryService`. Documentado en detalle en `LEF-BLOCK-V-DEFINITION.md` §12.
- **Bloque III, `verify-cosmetic-equipment-gate.ts` §13** (verifica textualmente que ningún controller importa `CosmeticItemRepository` directamente): sigue en PASS literal — `CosmeticEquipmentController` (Incremento 6) no lo importa directamente, solo `UserService`. Documentado en `LEF-BLOCK-V-DEFINITION.md` §14.
- **Bloque IV, `verify-competitive-profile-gate.ts` (mobile)**: **actualizado** en el Incremento 8 (no solo referenciado) — las aserciones que describían la arquitectura antigua de `CompetitiveProfileSection` (auto-alimentada) se reemplazaron por aserciones equivalentes contra la arquitectura nueva (presentación pura, `PublicProfileView` compartido). Cobertura funcional verificada como no disminuida (ver `feat(mobile)` commit del Incremento 8, y confirmación explícita del Product Owner en la revisión de ese incremento). Ninguna otra sección de ese gate fue tocada.

En los tres casos, la nota existe para que un lector futuro entienda por qué el PASS histórico sigue siendo válido pese a que la superficie real cambió — nunca para encubrir una laguna.

## 15. Confirmación: ningún sistema cerrado fue reabierto

- **Bloques I-III, ADR-0018, ADR-0020**: sin cambios de código en este bloque — solo lectura o enmienda mínima y explícitamente autorizada (ADR-0021, Incremento 1).
- **Bloque IV / ADR-0021**: enmendado únicamente en su §2 (lista blanca), dos veces (Incremento 1: `banner`; Incremento 2: `featuredAchievements`) — ambas enmiendas documentadas dentro del propio ADR-0021, ningún otro contenido de ese ADR reabierto.
- **ADR-0022 / DG-1 / Gate C5** (Tutor IA, Bloque VI futuro): intactos en los 9 commits de este bloque — confirmado por `git diff` vacío contra `docs/adr/0022-proveedor-ia-tutor.md` en cada cierre de incremento.
- **Bloque VI/Tutor IA (superficie mobile `ia.tsx`)**: intacto — confirmado por `git diff` vacío en el cierre del Incremento 8.
- **Incremento 8 no implementó nada del Bloque VI** ni introdujo economía/tienda/upload — confirmado por inspección explícita en cada incremento.

## 16. Estado final

**APPROVED.** Bloque V — Perfil Avanzado queda implementado, validado y cerrado. Un estudiante puede ver su encabezado de perfil consolidado (banner, avatar, marco, título, nivel, liga, insignias destacadas curadas), su resumen académico y competitivo privados, su historial competitivo cross-temporada, personalizar su perfil con visibilidad clara de qué le falta por desbloquear y con qué requisito real, y verificar exactamente cómo lo ve un tercero — todo con superficie backend y móvil completas, gateado individualmente y en conjunto (`verify:lef-block-v-gate`), con al menos una ejecución de extremo a extremo en PASS limpio (2026-08-11, cero fallos en 2635 líneas de log) y verificado manualmente en Browser pane con sesión real, dos veces (cuenta nueva y cuenta poblada). Ningún sistema de bloques anteriores fue reabierto; ningún componente de Tutor IA (Bloque VI) fue anticipado.

**No se considera suficiente la existencia del código fuente como demostración de cumplimiento — toda afirmación de este reporte está respaldada por una ejecución real registrada.**

Siguiente paso del roadmap: **Bloque VI de la Fase 2 — Learning Experience Foundation (Tutor IA)**, a definir formalmente cuando el Product Owner lo autorice.

---

**Bloque V — Perfil Avanzado: implementado, validado y cerrado (2026-08-11).**
