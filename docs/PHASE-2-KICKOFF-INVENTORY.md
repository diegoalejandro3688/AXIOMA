# Inventario previo al Kickoff de Fase 2

**Fecha**: 2026-08-03
**Estado**: Insumo para decisión — no es un roadmap, no autoriza implementación.
**Fuentes revisadas**: `prd.txt`, `datamodel.txt`, `master_context.txt`, `userflows.txt`, `appmap.txt`, `docs/adr/0001-0015`, `AXIOMA PHASE 1 KICKOFF.pdf`.

## 0. Dos contradicciones que deben resolverse ANTES de fijar el objetivo de Fase 2

### 0.1 Numeración de fases: el PRD/Master Context no tienen una "Fase 2" que hable de Competir/IA/Gamificación

El Kickoff de Fase 1 que usamos para M1 (Bloques I–V) define su propia numeración de bloques, pero **no es la misma numeración de fases que usan `prd.txt` y `master_context.txt`**:

| Numeración de PRD/Master Context (secciones 10.6–10.10 / 21.4–21.9) | Contenido |
|---|---|
| Fase 0 | Definición y preparación (los propios documentos: PRD, Data Model, Master Context, App Map, User Flows) |
| Fase 1 | Fundaciones técnicas (auth, cuenta, perfil inicial, backend modular, persistencia, taxonomía, navegación, observabilidad) |
| **Fase 2** | **"Vertical educativa M1"** — objetivo/recomendación/guía/preguntas/respuesta/retroalimentación/progreso/repaso |
| Fase 3 | Alpha interna |
| Fase 4 | Beta privada por expansión (agrega Comp. Lectora, Matemática M2, Historia, Ciencias) |
| Fase 5 (solo PRD) | Completitud de contenido |

Es decir: **lo que el Kickoff llama "Fase 1 — Vertical Slice M1" es, en la numeración del PRD/Master Context, su propia "Fase 2"**. La "Fase 2" que estamos a punto de diseñar (post-M1, con Competir/IA/Gamificación/Perfil avanzado/Social) **no tiene nombre ni número en ningún documento de fuente de verdad** — no existe una sección "Fase 2" del PRD que la describa, porque esa etiqueta ya está usada para otra cosa.

**Implicación práctica**: el Kickoff formal de Fase 2 debe fijar explícitamente que usa la numeración del *roadmap de bloques* (Kickoff Fase 1 → ahora "Fase 2" de ese roadmap), no la numeración del PRD/Master Context — y debería decirlo en su primera página, para que nadie confunda ambas numeraciones más adelante.

### 0.2 "Juego" vs. "Competir": contradicción editorial directa, no solo un término viejo

Ya sabíamos por ADR-0009 que Master Context retira "Juego" a favor de "Competir" (línea 1871: *"La denominación anterior de la tercera pestaña queda retirada. No deberá aparecer en documentación, rutas, módulos, eventos, componentes o código nuevo."*).

Lo nuevo: **el PRD no solo usa "Juego" residualmente — su propio changelog de consolidación lo re-afirma como decisión** (`prd.txt`, sección A.1, línea 12430): *"Se estableció Juego como nombre canónico de navegación y Competir como modo interno."* Eso es exactamente lo opuesto a lo que fija Master Context. No es un desliz editorial aislado — "Juego" aparece de forma consistente en decenas de lugares del PRD (navegación, flujos, principios de producto), con "Competir" tratado como un modo *dentro* de Juego.

Ninguno de los documentos declara explícitamente cuál prevalece entre sí (el PRD cita como autoridad principal al "AXIOMA ENGINEERING HANDBOOK", no a Master Context ni a sí mismo). El código ya construido usa "Competir" (Master Context ganó en la práctica, vía ADR-0009), pero el PRD nunca fue corregido para reflejarlo.

**Implicación práctica**: el Kickoff de Fase 2 debería declarar formalmente "Competir" como el nombre definitivo (ratificando lo que el código ya hace) y dejar registrada la corrección pendiente en el PRD — no siguiente inventando el arreglo ahora, tú decides si eso se corrige como parte del Kickoff o como una tarea documental aparte.

---

## 1. Funcionalidades diferidas explícitamente a Fase 2 (candidatas)

Del propio Kickoff de Fase 1 (§5.2), quedaron fuera de M1 explícitamente:
- **Competir**: rankings, ligas, versus, eventos, clasificaciones.
- **IA**: tutor inteligente, explicaciones asistidas, recomendaciones mediante IA.
- **Gamificación avanzada**: XP visible, niveles, títulos, insignias, cosméticos, desafíos.
- **Perfil avanzado**: perfil público, username definitivo, avatar, estadísticas públicas, historial competitivo.
- **Funcionalidades sociales**: amigos, búsqueda de usuarios, compartir progreso, mensajería.
- **Plataforma editorial**: herramientas internas de creación, flujo editorial completo, moderación, gestión avanzada de recursos.

`appmap.txt` (borrador, "Estado: En diseño") tiene su propia lista de "No incluido en el MVP" (línea 301): ranking de amigos, eventos temporales, historial avanzado de IA, clubes o equipos, logros estacionales, funciones sociales — coincide en espíritu, pero su "MVP" de referencia ya incluye Competir/Liga/Pregunta rápida/IA chat básico/Avatar/Estadísticas — es decir, describe un alcance más amplio que el M1 real que terminamos construyendo. Tratar `appmap.txt`/`userflows.txt` como visión de producto de referencia para Fase 2, no como especificación cerrada — ambos están marcados como borrador, no aprobados 1.0 como PRD/Data Model/Master Context.

## 2. Decision Gates pendientes arrastrados desde ADR-0001–0015

Los 5 ya conocidos (correctamente diferidos, no bloquearon M1):

| ADR | Decision Gate |
|---|---|
| 0004 | Validación contra proyecto Firebase real (M1 usa `StubIdentityClient`) |
| 0005 | Advisory lock para múltiples réplicas del backend (hoy instancia única) |
| 0008 | Carga de imágenes de perfil vía S3/R2 |
| 0009 | Mecanismo de almacenamiento seguro de credenciales (`expo-secure-store`), atado al login real de Firebase |
| 0010 | Aprovisionamiento de cuenta/bucket real de Cloudflare R2 (hoy MinIO local) |

Nuevos, encontrados en el Data Model (`datamodel.txt`, sección 27.7, **DM-OQ001 a DM-OQ054**, "Open Questions" — con gate formal "Gate DM-4", que aclara que no bloquean el modelo conceptual pero sí quedan pendientes de resolución con propietario y plazo):
- Motor de base de datos definitivo a largo plazo (DM-OQ001).
- Outbox transaccional vs. event bus real (DM-OQ005/6).
- Cifrado a nivel de campo para datos sensibles (DM-OQ006/9).
- Representación definitiva de fórmulas matemáticas (relevante — cruza con ADR-0002, "no reabierta").
- Taxonomía PAES exacta y granularidad canónica.
- Métodos de autenticación disponibles más allá de Firebase.
- Si se guarda fecha de nacimiento exacta o categoría etaria.
- **"¿Cuándo se exigirá el nombre de usuario de Juego?"** — directamente relevante para Perfil avanzado/Fase 2.
- Tamaño mínimo del banco de preguntas por tema/dificultad.
- Tipos de pregunta habilitados en V1 (M1 solo implementó `SINGLE_CHOICE`).
- Metodología de cálculo del dominio inicial/estimado (Bloque 13 del Data Model, `recommendation_methodology`).

Además, el Data Model ya reserva estructura conceptual para capacidades que M1 explícitamente no tocó (Bloque 11 — `assessment_definition/version/attempt/session`, práctica/ensayos cronometrados; Bloque 12 — `academic_evidence`, evidencia académica ponderada) — ADR-0014 ya las descartó para M1 por falta de necesidad demostrada; siguen ahí, diseñadas, sin implementar.

## 3. Dependencias técnicas ya disponibles (diseño existente, sin implementar)

El Data Model ya tiene diseño conceptual completo para varias áreas candidatas a Fase 2 — esto reduce el trabajo de diseño previo si se eligen:

- **Gamificación** (Bloque 16 completo del Data Model, trazabilidad GAME-001 a GAME-033): XP, niveles, rachas, logros, ligas, rankings — ya modelado.
- **Perfil público/social**: entidad `public_profile` con `leaderboard_visibility`, eventos `public_profile_created.v1`/`public_profile_visibility_changed.v1` — ya modelado.
- **Cosméticos/títulos**: `account_title`, `equipped_cosmetic` (trazabilidad PROFILE-001 a PROFILE-011) — ya modelado.
- **Recommendation**: dominio propio con `recommendation_methodology` — el motor de recomendación (probablemente parte de "IA") ya tiene un lugar reservado en el Data Model, aunque su metodología de cálculo sigue como Open Question (ver categoría 2).
- **Ranking/Liga**: terminología ya fijada en el glosario de Master Context ("Liga → League", "Ranking → Leaderboard/Ranking").
- **Sin modelo de datos listo**: no se encontraron entidades de "amistad"/"friend" en el Data Model — las funciones sociales (amigos) están mencionadas conceptualmente en el PRD pero sin diseño de datos correspondiente. Si Fase 2 prioriza Social, ese diseño falta por completo.

## 4. Riesgos de alcance para Fase 2

- Master Context (línea 7754, dicho de la fase educativa): *"No deberá expandirse a otra prueba para ocultar una vertical M1 incompleta."* — principio anti-scope-creep, aplicable igual de bien a Fase 2.
- PRD (línea 2237): *"Estudio continuará siendo la experiencia principal incluso si Juego, IA o Premium producen más interacción"* — prioridad de producto explícita: Estudio &gt; Competir/IA, aunque Fase 2 amplíe estos últimos.
- PRD (líneas 2725/2753): *"Juego siempre mantiene un camino de regreso al aprendizaje"* / *"Juego no se convierta en un recorrido desconectado"* — riesgo explícito de que Competir se desconecte del aprendizaje real.
- Data Model (línea 2348, DM-D034): *"Gamification dependerá de actividad validada, pero Progress no dependerá de Gamification"* — dependencia de una sola dirección: Gamificación necesita Progress/evidencia (ya construido en M1) y no al revés. No bloquea, pero fija el orden correcto si se implementa.
- Data Model (línea 2427): *"Si Gamification falla, la actividad académica permanece válida"* — principio de aislamiento de fallos a preservar en el diseño de Fase 2.
- IA: sin declaración explícita de dependencia técnica dura, pero principio repetido de que *"la IA nunca reemplaza el estudio, lo complementa"* (User Flows) y que genera *"más valor como herramienta contextual que como chat independiente"* (PRD línea 1586) — orienta el ALCANCE de una eventual IA, no solo su arquitectura.

## 5. Contradicciones entre documentos (más allá de las 2 críticas de la sección 0)

- **"Implementation Matrix"** citada en varios ADR no existe como documento ni como sección dentro de PRD/Data Model/Master Context/User Flows/App Map — es un artefacto separado, aparentemente no incluido en este barrido. Antes de citarla en el Kickoff de Fase 2 habría que localizarla o confirmar que ya no se usa.
- No se encontraron mismatches de versión (todos los documentos declaran v1.0) ni otros nombres de módulo divergentes más allá de Juego/Competir.
- `userflows.txt`/`appmap.txt` siguen marcados "Estado: En diseño", con secciones de sugerencias abiertas del autor al final — tratar como visión de producto de referencia, no como especificación cerrada equivalente a PRD/Data Model/Master Context.
