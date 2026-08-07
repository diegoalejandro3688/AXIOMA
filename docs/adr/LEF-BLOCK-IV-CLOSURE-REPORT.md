# LEF Block IV Closure Report — Competir

**Fecha de cierre**: 2026-08-07
**Fase**: Fase 2 — Learning Experience Foundation
**Bloque**: IV de VIII (Roadmap Learning Experience Foundation)
**Documentos relacionados**: `docs/adr/LEF-BLOCK-IV-DEFINITION.md`, `docs/adr/0020-ranking-materializacion.md`, `docs/adr/0021-perfil-competitivo-cross-cuenta.md`, `docs/adr/BLOCK-III-CLOSURE-REPORT.md`
**Estado final**: **APPROVED**

**Nota de nomenclatura**: este reporte usa el prefijo `LEF-` porque `docs/adr/BLOCK-IV-CLOSURE-REPORT.md` y `BLOCK-V-CLOSURE-REPORT.md` ya existen, pertenecientes a un roadmap distinto y anterior (Fase 1 — Vertical Slice M1, "Bloque IV/V de V") — ver `LEF-BLOCK-IV-DEFINITION.md`, nota de nomenclatura inicial.

## 1. Objetivo

Definido formalmente en `LEF-BLOCK-IV-DEFINITION.md` (§2): dar al estudiante una experiencia competitiva asincrónica y sin presión constante — una liga con posiciones, progreso de periodo y recompensas, y una forma rápida de poner a prueba su conocimiento — sin introducir emparejamiento en tiempo real, sin exponer información académica privada de ningún estudiante a otro, y sin que el ranking se convierta en el destino principal de la pantalla. Explícitamente fuera de alcance: Versus en tiempo real, señales de integridad/anti-fraude, clubes/equipos/ranking de amigos, Perfil Avanzado consolidado (Bloque V).

## 2. Incrementos realizados

Cinco incrementos, cada uno con su propio gate en PASS:

| Incremento | Contenido | Commits |
|---|---|---|
| **1. Fundación de temporadas y ligas** | `game_season`/`league_definition`/`league_group`/`season_league_participation`/`league_point_rule`/`league_point_ledger_entry` (independiente de `xp_ledger_entry`). Advisory lock de capacidad de grupo (namespace 21), asignación inicial siempre al tier más bajo, ledger append-only con reverso como fila nueva. Gates de concurrencia real (`Promise.all`) sobre capacidad de grupo, inscripción idempotente bajo carrera, y la carrera otorgamiento-vs-cierre de temporada. | Checkpoint sin tag (§9 de la definición) |
| **2. Ranking** | `leaderboard_definition`/`leaderboard_entry`, proyección materializada + `leaderboard_snapshot` inmutable al cierre, desempate determinista de tres factores, recálculo por worker programado. **ADR-0020** (APPROVED). | `26c28f1` |
| **3. Perfil competitivo de otro usuario** | Primer endpoint público cross-cuenta de la aplicación, lista blanca estricta, redacción de filas no presentables en el ranking (`presentable: false` expone únicamente `{presentable, isCurrentUser, rankPosition, metricValue}`, garantizado por unión discriminada de TypeScript). **ADR-0021** (APPROVED). Sub-incrementos 3.a/3.b/3.c. | `4eb676b`, `f7909da`, `7decfaa` |
| **4. Pregunta rápida** | `quick_question_session`/`quick_question_attempt` (entidades propias, no el framework genérico de EDUCATION), selección aleatoria server-side sin repetición dentro de sesión, publicación best-effort post-commit del evento `quick_question_answered` (mismo patrón que `ProgressService`, ADR-0006). Sub-incrementos 4.a/4.b/4.c. | `5ec321f`, `d1daafb`, `599c7b0` |
| **5. Superficie móvil** | Reemplaza los tres shells "Próximamente" del tab Competir: hub con enrolamiento explícito e idempotente de liga (corrección de fondo sobre el diseño inicial, §14.1 de la definición), ranking paginado con "Ver más" y redacción respetada por el cliente, perfil competitivo propio/de terceros con componentes compartidos, Pregunta rápida con sesión reanudable (`close()` solo desde "Salir") y reconciliación tras `409`. Sub-incrementos 5.a/5.b/5.c/5.d. | `0c60194`, `54c5d52`, `61ea8d9`, `5f13394` |

**ADR propio**: dos nuevos — **ADR-0020** (proyección materializada con recálculo periódico + snapshot inmutable, patrón nuevo distinto de "derivar en lectura" y de "entrega directa inmutable") y **ADR-0021** (primer endpoint público cross-cuenta, patrón de autorización nuevo). Incrementos 1, 4 y 5 no requirieron ADR nuevo — reutilizan mecanismos ya aprobados en Bloques I-III aplicados a tablas/pantallas nuevas (confirmado incremento a incremento en `LEF-BLOCK-IV-DEFINITION.md` §9.10/§12.7/§13, mismo criterio que Bloque III).

## 3. Decision Gates y estado

Los Decision Gates de este bloque (`LEF-BLOCK-IV-DEFINITION.md`, fijados a nivel de bloque en §5 y refinados por incremento en §9-§14) están **todos en PASS**. Resumen por área:

| Área | Estado |
|---|---|
| Fundación de temporadas y ligas (18 secciones, 53 verificaciones, incluida concurrencia real) | PASS |
| Ranking (ADR-0020) | PASS |
| Perfil competitivo cross-cuenta (ADR-0021), incluida ausencia de N+1 | PASS |
| Pregunta rápida (fundación, motor, endpoints HTTP) | PASS |
| Participación de liga (backend + mobile), incluida inscripción concurrente idempotente | PASS |
| Ranking móvil, perfil competitivo móvil, Pregunta rápida móvil | PASS |
| Sin `leaderboard_visibility`/`competition_visibility` nuevos, sin señales de integridad nuevas en V1 | PASS |

Ningún gate quedó en "requiere corrección" al cierre.

## 4. Gate consolidado

`verify:lef-block-iv-gate` (nuevo, `scripts/verify-lef-block-iv-gate.mjs`) — orquestador, mismo criterio que `verify:block-iii-gate`: invoca el gate consolidado del Bloque III completo (que a su vez invoca Bloque II, Bloque I y M1) como un solo paso, y agrega los cinco gates propios de este bloque sin HTTP, los cuatro gates HTTP (cada uno con su propia instancia de backend), y los cuatro gates mobile de la superficie de Incremento 5.

```
Gate consolidado Bloque III (M1 + Bloque I + II + III)                    PASS
Incremento 1 -- Fundación de temporadas y ligas                           PASS
Incremento 2 -- Ranking                                                   PASS
Incremento 3 -- Perfil competitivo: fundación                             PASS
Incremento 4 -- Pregunta rápida: fundación                                PASS
Incremento 4 -- Pregunta rápida: motor de sesión                          PASS
Incremento 3 -- Perfil competitivo: endpoint individual                   PASS
Incremento 3 -- Ranking con redacción                                     PASS
Incremento 4 -- Pregunta rápida: endpoints HTTP                           PASS
Incremento 5.a -- Participación de liga (backend)                        PASS
Incremento 5.a -- Participación de liga (mobile)                         PASS
Incremento 5.b -- Ranking (mobile)                                       PASS
Incremento 5.c -- Perfil competitivo (mobile)                            PASS
Incremento 5.d -- Pregunta rápida (mobile)                               PASS

Gate consolidado Bloque IV (LEF): PASS
```

`verify:learning-experience-foundation-gate` actualizado para invocar `verify-lef-block-iv-gate.mjs` en vez de `verify-block-iii-gate.mjs` — mismo criterio de alias fino ya usado en cierres anteriores.

Ejecución real registrada el 2026-08-07: migraciones, seed, y toda la cadena de arriba — cada gate HTTP contra una instancia de backend recién iniciada (nunca reutilizada entre gates), mismo criterio de aislamiento por proceso que todos los bloques anteriores.

## 5. Incidencias reales encontradas durante la validación (causa raíz y resolución)

1. **Enrolamiento a liga dejado como deuda aceptada en el diseño inicial (5.a)** — el diseño original de §8 conectaba implícitamente `joinActiveSeason()` a `XpGrantService`. Corregido por el Product Owner antes de implementar: endpoint explícito e idempotente de autoservicio (`GET`/`POST /gamification/me/league/participation`), el GET nunca crea participación, el hub solo llama al POST desde un botón explícito.
2. **Publicación del evento de Pregunta rápida asumida transaccional en el diseño previo (4.a→4.b)** — verificado contra el código real de `OutboxService` antes de implementar: es best-effort post-commit por diseño (ADR-0006), nunca dentro de la misma transacción que el intento. Corregido en el diseño antes de escribir código, no como fix posterior.
3. **Fragilidad preexistente en `verify-reward-evaluation-worker-gate.ts` (Bloque III, ya cerrado), encontrada durante la regresión de 4.c** — tratada explícitamente como fragilidad preexistente de un bloque ya cerrado, no como parte del alcance de este bloque; corregida en un commit independiente (`7864dbe`) sin reabrir Bloque III.
4. **Falsos positivos recurrentes en gates estáticos por coincidencia de substring** (5.a-5.d) — varios gates que inspeccionan código fuente vía regex/substring produjeron falsos positivos al no aislar el cuerpo de la función relevante (ej. verificar "closeQuickQuestionSession solo en handleExit" contra el archivo completo en vez del cuerpo de esa función). Corregido de forma consistente aislando el bloque relevante vía `indexOf`/slicing antes de aplicar el patrón, en cada gate afectado.
5. **Ranking aparentemente "atascado" en 10 filas durante la verificación manual en Browser pane** — investigado con tres métodos independientes (fetch directo al backend con `StubIdentityProvider`, conteo real en Postgres, inspección de `FlatList.memoizedProps.data.length` vía React Fiber): la lógica de paginación/merge/dedup es correcta; es una limitación de virtualización (`initialNumToRender`) de React Native Web en un navegador headless sin scroll táctil real, no un defecto de producto. No se modificó código.
6. **Ledger de puntos de liga append-only, descubierto al intentar limpiar datos de verificación manual** — un trigger de Postgres (`enforce_league_point_ledger_entry_no_delete`) rechazó el `DELETE`. Esto **corrigió** una sospecha inicial de "higiene incompleta" en un gate de Bloque IV Incremento 2 que había dejado una temporada/grupo de prueba sin limpiar: no es un bug de higiene, es consecuencia esperada de la inmutabilidad del ledger (§9.5/§9.8 de la definición) — ningún gate puede borrar entradas ya escritas. Ver §7 (residuos aceptados).

## 6. Notas de diseño corregidas durante la implementación

Documentadas en detalle en `LEF-BLOCK-IV-DEFINITION.md` — no se duplican aquí:

- **§4.4/§9.4-§9.5**: League Points como fuente de verdad independiente de XP, con ventana de elegibilidad no retroactiva (`[participation.joinedAt, season.endsAt)`) y clave de idempotencia que vincula participación Y actividad (a diferencia de XP).
- **§9.9**: tres gates de concurrencia real obligatorios (capacidad de grupo, inscripción idempotente bajo carrera, otorgamiento-vs-cierre de temporada) — el tercero disparó un conflicto SERIALIZABLE real durante su propia ejecución, resuelto correctamente por `runSerializable`.
- **§10.11 (corregida por ADR-0020)**: la identidad autoritativa del cálculo de ranking es `season_league_participation`, nunca `public_profile` — la visibilidad de perfil no altera el cálculo competitivo bajo ninguna circunstancia, solo su presentación.
- **§14.1**: enrolamiento explícito de autoservicio, corrección de fondo sobre el diseño original (ver §5.1 arriba).
- **§14.4**: navegar hacia atrás nunca cierra una sesión de Pregunta rápida — solo el botón "Salir" invoca `close()`, decisión de fondo confirmada antes de implementar.

## 7. Artefactos temporales y residuos aceptados

Búsqueda de `TODO`/`FIXME`/`XXX`/`debugger` sobre los archivos nuevos o modificados de este bloque (backend `gamification`, mobile `competir/`): sin residuos de instrumentación temporal. El script de siembra usado para la verificación manual de 5.a-5.d (`manual-verification-seed.ts`, nunca commiteado) fue eliminado al finalizar.

**Residuo aceptado, documentado con transparencia**: los datos sintéticos creados por ese script (25 `season_league_participation` + `league_point_ledger_entry` de prueba, 2 `league_point_rule`, 3 `public_profile`) no pudieron eliminarse — `league_point_ledger_entry` es append-only por diseño (trigger `enforce_league_point_ledger_entry_no_delete`, §9.5/§9.8). Quedan como residuo permanente e inofensivo en la base de datos de **desarrollo**, sin efecto en producción (la base de desarrollo se sembrará de cero en cualquier entorno nuevo). Mismo criterio de transparencia que el resto de las incidencias de este reporte.

## 8. Evidencia de validación

```
typecheck (repo completo)                          PASS
lint (repo completo)                                PASS
build (contracts + backend)                         PASS
verify:block-iii-gate (M1 + Bloque I + II + III)    PASS
verify:league-season-foundation-gate                PASS (18 secciones, 53 verificaciones, concurrencia real)
verify:league-ranking-gate                          PASS
verify:competitive-profile-foundation-gate          PASS (sin N+1: consultas fijas, no escalan con la cantidad de cuentas)
verify:competitive-profile-endpoint-gate            PASS
verify:competitive-leaderboard-gate                 PASS (sin N+1: consultas fijas, no escalan con el tamaño de página)
verify:quick-question-foundation-gate               PASS
verify:quick-question-engine-gate                   PASS
verify:quick-question-http-gate                     PASS
verify:league-participation-gate (backend)          PASS (inscripción concurrente idempotente real)
verify:lef-block-iv-gate (consolidado, nuevo)        PASS
verify:learning-experience-foundation-gate          PASS (alias actualizado a Bloque IV)

Mobile:
tsc --noEmit (apps/mobile)                          PASS
eslint (apps/mobile)                                PASS
verify:league-participation-gate (mobile)           PASS
verify:leaderboard-gate                             PASS
verify:competitive-profile-gate                     PASS
verify:quick-question-gate                          PASS

Verificación manual real (no solo gates automatizados):
Recorrido funcional completo en Browser pane (hub, ranking, perfiles, Pregunta rápida)      PASS
  -- incluye cambio de tema durante carga de segunda página de ranking (React Fiber)         PASS
  -- incluye reanudación de sesión de Pregunta rápida (proxy de cierre completo en Web)       PASS
Verificación en dispositivo Android físico (Product Owner, 2026-08-07): gestos del sistema,
TalkBack, doble toque táctil real, contraste visual percibido, comportamiento en Expo Go,
cierre completo de la app durante sesión activa de Pregunta rápida con recuperación de la
misma pregunta pendiente                                                                     PASS, sin hallazgos
```

Cada gate HTTP se corrió contra una instancia de backend recién iniciada (nunca reutilizada entre gates). Toda afirmación de este reporte está respaldada por una ejecución real registrada arriba, incluida la ejecución completa de `verify:lef-block-iv-gate` el 2026-08-07.

## 9. Lecciones aprendidas

- **Verificar el código real antes de diseñar contra una lectura literal del Data Model evita retrabajo** — la corrección de §13.3 (publicación best-effort de `OutboxService`, no atómica) se hizo en el propio brief antes de escribir código, no como fix posterior; mismo criterio ya validado en bloques anteriores.
- **Un gate estático que usa regex/substring sobre el archivo completo produce falsos positivos frecuentes cuando el patrón buscado también aparece en comentarios, imports u otras funciones** — aislar el cuerpo de la función relevante vía `indexOf`/slicing antes de aplicar el patrón fue necesario en al menos cinco gates distintos de este bloque (§5.4). Vale la pena tratarlo como convención por defecto en futuros gates estáticos, no como corrección puntual.
- **Una invariante de dominio (ledger append-only) puede explicar retroactivamente un hallazgo que parecía un bug de higiene** — el residuo de un gate anterior que no limpiaba su temporada/grupo de prueba resultó ser consecuencia esperada de la misma invariante que protege la integridad del ledger de producción, no un descuido corregible.
- **La verificación manual sistemática en un entorno de automatización de navegador (headless) encuentra sus propios falsos positivos, distintos de los de un gate automatizado** — la virtualización de `FlatList` en RN Web parecía un bug de datos hasta que se inspeccionó el estado real de React Fiber; ninguna cantidad de gates de lógica pura lo habría revelado ni descartado sin esa inspección adicional.
- **Algunas pruebas de verificación manual solicitadas no son literalmente reproducibles en el target Web** (cierre completo de la app con persistencia real de SecureStore) — sustituir por la prueba equivalente más cercana alcanzable, documentando explícitamente la limitación y dejando la confirmación literal para el dispositivo físico, es preferible a forzar una prueba que el entorno no puede ejecutar honestamente.

## 10. Estado final

**APPROVED.** Bloque IV — Competir queda implementado, validado y cerrado. El estudiante puede unirse explícitamente a una liga, ver su posición y la de otros de forma asincrónica y respetuosa de la privacidad, ver el perfil competitivo público de otro estudiante desde el ranking, y jugar Pregunta rápida de forma individual con retroalimentación inmediata — todo con superficie backend y móvil completas, gateado individualmente y en conjunto (`verify:lef-block-iv-gate`), y verificado manualmente tanto en Browser pane como en un dispositivo Android físico real, en ambos casos sin hallazgos. Ningún componente de bloques posteriores (Versus en tiempo real, señales de integridad, Perfil Avanzado consolidado) fue anticipado.

Siguiente paso del roadmap: **Bloque V de la Fase 2 — Learning Experience Foundation**, a definir formalmente cuando el Product Owner lo autorice.

---

**Bloque IV — Competir: implementado, validado y cerrado (2026-08-07).**
