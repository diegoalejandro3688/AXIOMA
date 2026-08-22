# Profile Closure Report — Cierre de la superficie móvil de Perfil (PROFILE-1 → PROFILE-FINAL)

**Fecha del reporte**: 2026-08-22
**Dominio**: Superficie móvil de Perfil (`apps/mobile/app/(tabs)/perfil/*`, componentes de identidad/cosméticos/títulos asociados)
**Documentos relacionados**: `docs/adr/LEF-BLOCK-V-DEFINITION.md` (Incrementos 5/6/7/8, origen del agregador `GET /user/me/advanced-profile` y de la superficie móvil de Perfil), `docs/adr/0018-public-profile-foundation.md`, `docs/adr/0021-perfil-competitivo-cross-cuenta.md`.

**Estado final**: **APPROVED / CLOSED** — todas las verificaciones de este cierre (TypeScript, ESLint, los 3 gates de dominio) terminan en PASS sobre el estado final del repositorio; los defectos reales encontrados durante la auditoría (§9) fueron corregidos y reverificados; no queda ningún defecto bloqueante.

## 1. Objetivo de Perfil

Ofrecer al usuario una superficie donde reconocer su identidad competitiva (avatar, marco, banner, displayName, nivel, liga), revisar su progreso (académico y competitivo) y controlar cómo se presenta y configura su cuenta — sin fragmentar esa información en pantallas desconectadas ni duplicar las fuentes de datos que ya expone el backend (LEF Bloque V, Incremento 5).

## 2. Arquitectura final

```
Perfil (app/(tabs)/perfil/index.tsx)
├── Hero (CompetitiveProfileSection → CompetitiveIdentityHeader)
│   ├── banner + engranaje (→ Ajustes, panel local)
│   ├── avatar + marco + lápiz (→ Personalización, pantalla dedicada)
│   ├── displayName (protagonista) / @username (secundario)
│   ├── LevelBadge + Nivel
│   └── liga compacta (texto, sin card, sin CTA)
├── "Ver cómo me ven otros" (→ preview.tsx)
├── Selector local Resumen | Estadísticas (estado, sin rutas hijas)
│   ├── Resumen: SubjectProgressSection
│   └── Estadísticas: AcademicStatsSection (card horizontal) + CompetitiveHistorySection
└── Ajustes (Dialog generalizado, montado aquí, SIN ruta)
    ├── Editar nombre (expandible, sembrado desde view.profile)
    ├── Username/Privacidad (mutuamente excluyentes, lazy load)
    └── Cerrar sesión

Personalización (app/(tabs)/perfil/personalizacion.tsx)
└── Tabs Avatar | Banner | Insignia | Título
    ├── Avatar: CosmeticSlotCard(AVATAR) + CosmeticSlotCard(AVATAR_FRAME)
    ├── Banner: CosmeticSlotCard(PROFILE_BANNER)
    ├── Insignia: CosmeticSlotCard(BADGE)
    └── Título: TitlesSection
    (un único useCosmeticsController() compartido por las 4 tabs)
```

## 3. Evolución resumida PROFILE-1 → PROFILE-5B

- **PROFILE-1**: safe area, jerarquía visual base, integración de `LevelBadge`, resumen académico con datos reales, controles administrativos agrupados.
- **PROFILE-2**: extracción de Personalización a pantalla dedicada (`personalizacion.tsx`), reutilizando `CosmeticsSection` sin duplicar su lógica de equipamiento.
- **PROFILE-3**: recomposición horizontal del hero (avatar+identidad junto al banner), tres puntos + lápiz como accesos a Personalización, retiro de headings redundantes.
- **PROFILE-4**: reorganización mayor — selector local Resumen/Estadísticas, retiro del card navy de liga (`CompetitivePositionCard`) del hero propio a favor de metadata compacta, traslado de configuración/privacidad/logout a Personalización, división de `AcademicSummarySection` en `AcademicStatsSection`/`SubjectProgressSection`.
- **PROFILE-5A**: fix estructural del hero (displayName invadiendo el banner por un `marginTop` negativo mal alcanzado tras crecer el bloque de texto), traslado de Títulos a Personalización, aire adicional en Progreso por materia.
- **PROFILE-5A.1**: microajuste de espaciado de "Ver cómo me ven otros" (márgenes negativos puntuales, sin tocar el gap del contenedor).
- **PROFILE-5B**: reorganización final — Personalización queda exclusivamente dedicada a apariencia (tabs Avatar/Banner/Insignia/Título sobre un controlador de cosméticos compartido), Ajustes nace como panel local (`Dialog` generalizado) que absorbe displayName/username/privacidad/logout, tres puntos se repropone a engranaje (→ Ajustes), `AcademicStatsSection` se compacta a una card horizontal de 3 columnas.
- **PROFILE-FINAL** (este cierre): auditoría integral, corrección de 2 defectos reales encontrados (§9), verificación técnica completa, documentación de cierre.

## 4. Decisiones finales de producto

- El hero es el inicio visual real de Perfil — sin headings redundantes ("Perfil", "Perfil competitivo").
- La liga es metadata compacta junto a Nivel, nunca una card ni una acción — la tab bar ya da acceso permanente a Competir.
- Personalización = apariencia exclusivamente. Ajustes = cuenta exclusivamente. Ningún control administrativo vive en el hero ni en Resumen/Estadísticas.
- El lápiz (avatar) y el engranaje (banner) son los ÚNICOS accesos de edición del hero, cada uno con destino distinto y no redundante entre sí.
- `timezone` es y siempre fue puramente informativo — nunca tuvo una interacción de edición real en ninguna versión de la app; se conserva como texto de solo lectura en Ajustes.

## 5. Arquitectura de datos/fetch

- **Fuente única canónica**: `getMyAdvancedProfile()` (`GET /user/me/advanced-profile`) en `perfil/index.tsx` — alimenta hero, Resumen y Estadísticas. Cambiar de pestaña (Resumen ↔ Estadísticas) es estado local puro, cero fetch adicional.
- **Reconciliación**: `useFocusEffect` recarga el agregador cada vez que Perfil recupera el foco (p. ej. al volver de Personalización tras equipar un cosmético). Dentro de Ajustes (que no navega, es un panel local), las mutaciones (`initializeProfile`/`updateProfile`/`claimPublicProfile`) llaman explícitamente a `load()` para reconciliar el hero en la misma instancia de pantalla.
- **Fuentes independientes, deliberadamente separadas del agregador** (`visibilityStatus` no está en `meCompetitiveProfileResponseSchema`): `getMyPublicProfile()`, cargada LAZY (solo la primera vez que se abre Ajustes en la sesión de pantalla; reabrir sin mutar reutiliza el estado).
- **Personalización**: `useCosmeticsController()` — un único `listCosmetics()` por instancia de pantalla, compartido por las 4 tabs vía un controlador en el padre; `TitlesSection` mantiene su propio fetch independiente (`listTitles()`), sin relación con el agregador ni con el controlador de cosméticos.
- Ningún endpoint, contrato ni tabla de base de datos fue creado o modificado en todo el arco PROFILE-1 → PROFILE-FINAL.

## 6. Personalización — estado final

4 tabs (Avatar | Banner | Insignia | Título) sobre un único `useCosmeticsController()`. La tab Avatar muestra `CosmeticSlotCard(AVATAR)` y `CosmeticSlotCard(AVATAR_FRAME)` como dos tarjetas independientes — mismo controlador compartido, pero cada una lee/escribe únicamente su propia clave en `equipped`/`grouped`; nunca se fusionaron sus contratos ni su estado. Cambiar de tab no dispara `listCosmetics()` de nuevo — el estado ya resuelto vive en el padre. `TitlesSection` se reutiliza sin ningún cambio interno. Cero configuración de cuenta residual (confirmado por gate, §11).

## 7. Ajustes — estado final

Panel local (`Dialog` generalizado — mismo shell Modal+overlay+card ya existente en el proyecto, ahora con `children` arbitrario, 100% retrocompatible con sus usos previos de confirmación simple), montado en `perfil/index.tsx`, sin ruta propia. Contiene: editar nombre (expandible, sembrado desde `view.profile`, sin `getProfile()` redundante), username/privacidad (mutuamente excluyentes según `publicProfile === null`, carga lazy), cerrar sesión (`auth.logout`, sin cambio de comportamiento).

## 8. Resumen / Estadísticas — estado final

- **Resumen**: `SubjectProgressSection` únicamente (progreso por materia, con el aire adicional de PROFILE-5A). Sin estadísticas duplicadas, sin historial, sin configuración, sin títulos.
- **Estadísticas**: `AcademicStatsSection` (card horizontal, 3 columnas separadas por `Divider` vertical: Preguntas | Correctas | Precisión, "Correctas" con ícono `check`) + última actividad + `CompetitiveHistorySection` (mismo `view.competitiveHistory` del agregador, empty state real "Todavía no has finalizado ninguna temporada.").

## 9. Perfil propio vs. perfil público

- `CompetitiveIdentityHeader` es el único componente de hero, compartido entre perfil propio (`CompetitiveProfileSection`), perfil de terceros (`[username].tsx` → `PublicProfileView`) y vista previa (`preview.tsx` → `PublicProfileView`).
- `onPersonalizePress` (lápiz) y `onOpenSettings` (engranaje) son props OPCIONALES — `PublicProfileView` nunca los pasa, confirmado por inspección directa del archivo (cero ocurrencias). Ningún control de edición puede aparecer fuera del perfil propio.
- La liga compacta (vía `competitive`, prop también opcional) solo se activa en el hero propio; terceros/preview conservan `CompetitivePositionCard` completo sin cambios — asimetría intencional, documentada y protegida por gate.
- `[username].tsx`/`preview.tsx` permanecen de solo lectura (verificado por gate: cero símbolos de escritura, 404 uniforme sin distinguir motivo, sin normalización local de username, sin acceso a `.lifecycleStatus`, sin combinar con datos privados del agregador).

## 10. Defectos encontrados y corregidos durante este cierre

Dos defectos reales, ambos de la categoría "gate desactualizado respecto a la arquitectura real" — ninguno afectaba el comportamiento en producción, ambos debilitaban silenciosamente la cobertura de verificación:

1. **`verify-competitive-profile-gate.ts` §8** (`forbiddenPreviewAugmentationSymbols`): la lista seguía prohibiendo el nombre `AcademicSummarySection`, retirado en PROFILE-4 y reemplazado por `AcademicStatsSection`/`SubjectProgressSection`. La protección real ("`preview.tsx` nunca combina con secciones académicas privadas") seguía cumpliéndose de hecho, pero el check ya no verificaba los nombres reales que existen hoy. **Corrección**: lista actualizada a los símbolos actuales.
2. **Código muerto confirmado**: la función `CosmeticsSection` (envoltorio de los 4 slots en columna) quedó sin ningún consumidor real tras el refactor de PROFILE-5B a `useCosmeticsController`/`CosmeticSlotCard` — confirmado por búsqueda de imports en todo el proyecto (cero resultados) antes de eliminarla. **Corrección**: función y su estilo `container` asociado eliminados; import `COSMETIC_SLOTS` (que solo ella usaba) retirado. `useCosmeticsController` y `CosmeticSlotCard`, sus reemplazos reales, no se tocaron.

Ambas correcciones se revirtieron a PASS mediante las verificaciones de §12.

## 11. Invariantes protegidas (confirmadas activas tras este cierre)

- `CompetitiveProfileSection` es presentación pura -- sin `useState`/fetch propio (firma `{ profile, displayName, onPersonalizePress, onOpenSettings }`, las 4 de presentación).
- `perfil/index.tsx` es la única fuente de carga del agregador; nunca reintroduce `getMyCompetitiveProfile`/`getAcademicSummary`/`getCompetitiveHistory` por separado.
- Cosméticos/títulos bloqueados nunca son equipables y siempre muestran el requisito real (`describeUnlockRequirements`).
- Doble-toque bloqueado por slot (cosméticos) y globalmente (títulos), sin equipamiento optimista en ningún caso.
- `preview.tsx`/`[username].tsx` nunca combinan con superficies privadas (académico/historial/inventario/agregador), 404 uniforme, sin normalización de username.
- La tab "perfil" sigue siendo una única tab con exactamente 3 pantallas internas (`index`/`preview`/`personalizacion`) — Ajustes NO añadió una cuarta (es un panel local, no una ruta).
- Ningún control de edición (`onPersonalizePress`/`onOpenSettings`) llega nunca a `PublicProfileView`.
- `personalizacion.tsx` queda exclusivamente dedicada a apariencia; `perfil/index.tsx` es la única fuente real de la configuración de cuenta.

## 12. Gates ejecutados — evidencia de verificación

| Verificación | Resultado |
|---|---|
| `npx tsc --noEmit` | PASS, sin errores |
| `npm run lint` (`eslint app lib components --ext .ts,.tsx`, todo el proyecto mobile) | PASS, sin warnings ni errores |
| `verify:competitive-profile-gate` (`verify-competitive-profile-gate.ts`) | PASS — 9 secciones, todas las aserciones OK |
| `verify:advanced-profile-mobile-gate` (`verify-advanced-profile-mobile-gate.ts`) | PASS — 9 secciones, todas las aserciones OK |
| `verify:cosmetics-gate` (`verify-cosmetics-gate.ts`) | PASS — 5 secciones, todas las aserciones OK |

**Gate superior/de fase**: se buscó explícitamente un gate que incluyera el dominio de Perfil dentro de una verificación más amplia. El único gate de fase existente en el repositorio, `scripts/verify-lef-phase-2-gate.mjs` (raíz del monorepo), pertenece a un dominio distinto — LEF (Learning Experience Foundation), sin relación con la superficie de gamificación/Perfil de este cierre. No existe ningún "gate maestro" que agregue `verify-competitive-profile-gate`/`verify-advanced-profile-mobile-gate`/`verify-cosmetics-gate`; los tres se ejecutan de forma independiente vía `npm run verify:*` en `apps/mobile`. Se deja constancia de esta ausencia como hallazgo (no bloqueante, ver §13).

## 13. Deuda técnica no bloqueante

- **Sin gate agregador para el dominio de Perfil/gamificación móvil**: los 3 gates relevantes (`competitive-profile`, `advanced-profile-mobile`, `cosmetics`) se ejecutan por separado; no existe un `verify:profile-gate` (o equivalente) que los encadene en una sola invocación, a diferencia del patrón `verify-lef-phase-2-gate.mjs` usado en el dominio LEF. No bloquea este cierre — los 3 se ejecutaron y verificaron individualmente — pero facilitaría la regresión de futuros cambios en este dominio.
- **`app/(tabs)/perfil/_layout.tsx`**: su comentario de cabecera describe `index`/`preview` pero nunca llegó a documentar `personalizacion` (un intento de edición en PROFILE-2 falló por un desajuste de codificación de caracteres y no se reintentó). No es una inexactitud — solo una omisión de documentación; el `Stack.Screen` real y el gate que lo protege están correctos.
- **`'more-horizontal'`/`MoreHorizontalIcon`** permanecen registrados en `theme/icons/` sin ningún call-site activo tras PROFILE-5B (el control del banner ahora usa `'settings'`). Se conservan deliberadamente — son parte del sistema de íconos reutilizable del proyecto (mismo criterio que cualquier ícono de una librería compartida), no código de producto con lógica de negocio; su remoción no aporta valor y su presencia no representa riesgo.

Ninguno de los tres puntos anteriores es un defecto ni requiere acción antes de este cierre.

## 14. Estado final

> **APPROVED / CLOSED — Superficie móvil de Perfil (PROFILE-1 → PROFILE-FINAL).**
>
> Arquitectura validada físicamente en Android (PROFILE-5B) y confirmada de nuevo mediante auditoría estática íntegra en este cierre. Dos defectos reales encontrados durante la auditoría (§10) — ambos gates desactualizados respecto a la arquitectura real, ninguno un defecto de comportamiento en producción — corregidos y reverificados. `tsc --noEmit`, `eslint` (proyecto completo) y los 3 gates de dominio (`competitive-profile`, `advanced-profile-mobile`, `cosmetics`) en PASS sobre el estado final del repositorio. Ningún endpoint, contrato, dato competitivo/académico o pantalla nueva se introdujo en todo el arco. Deuda técnica identificada (§13) es no bloqueante y queda documentada para un incremento futuro, no para este cierre.
