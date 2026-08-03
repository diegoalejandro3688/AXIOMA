# ADR 0010 — Almacenamiento de contenido (object storage)

- **Estado**: Aprobada, con los nueve ajustes obligatorios del usuario ya incorporados — gate completo verificado (19+34+38+44+40 comprobaciones heredadas de ADR-0004/0005/0006/0007/0008 re-ejecutadas sin regresiones + 22 comprobaciones nuevas de OBJECT-STORAGE — conteos corregidos en Architecture Review 1.0, 2026-08-01, para coincidir con la ejecución real del gate), en local (Postgres de desarrollo + MinIO) y replicado como lo haría CI (Postgres y MinIO efímeros, bucket creado desde cero).
- **Fecha**: 2026-08-01
- **Fase de aplicación**: Fase 0 — Foundation, Paso 10
- **Responsable de aprobación**: Product Owner (usuario)
- **Nivel de decisión** (protocolo Master Context 11.9): Nivel 2 — Decision Gate explícito de Master Context 12.9 ("estrategia de object storage"), infraestructura de la que dependerá todo el dominio Education.

## Contexto

La Implementation Matrix v1.1 incluye "almacenamiento de contenido" en Fase 0. El Decision Gate de stack (2026-07-29) ya dejaba una inclinación hacia Cloudflare R2 "por costo", pero el usuario pidió explícitamente no decidir el proveedor por costumbre — este ADR documenta el análisis completo de 10 dimensiones que sustituye esa inclinación informal por una decisión justificada.

## Decision Gate (10 dimensiones)

1. **Tipos de archivo previstos para V1**: confirmado contra Data Model 9.1/9.11/9.12 y PRD 11461 — solo imágenes estáticas y diagramas (`educational_asset`). Video, audio y PDF quedan explícitamente fuera de V1. Las fórmulas matemáticas (LaTeX→SVG, ADR-0002) viajan *inline* en el payload del recurso, nunca como archivo de storage.
2. **Contenido que necesita almacenamiento externo**: solo `educational_asset_version.file_reference` (Data Model DM-OQ002: "archivos, exportaciones y recursos pesados en object storage; solo metadatos en la base"). Todo lo demás vive en Postgres.
3. **Acceso público vs. privado**: privado por defecto. Un asset en borrador/revisión nunca debe ser accesible sin pasar por Education, que decide qué está publicado y aprobado.
4. **URLs firmadas**: lectura (GET) de corta duración (segundos a minutos), generadas bajo demanda, nunca URLs públicas permanentes.
5. **CDN y caché**: prematuro para V1 (volumen bajo, Fase 1 exige una unidad deliberadamente pequeña). Objetos publicados son inmutables por versión, lo que deja la puerta abierta a `Cache-Control` agresivo por versión más adelante sin decisión de CDN ahora.
6. **Límites de tamaño y validación**: ver ajustes 1-4 más abajo — configurables, sin SVG, con sniffing de bytes mágicos y validación de dimensiones.
7. **Costos de almacenamiento y egreso**: razón de fondo para preferir R2 — patrón de uso read-heavy (miles de estudiantes consumiendo el mismo asset publicado); R2 no cobra egress, S3 sí. Diferencia de costo real, no cosmética.
8. **Desarrollo local y CI**: neutral entre proveedores — ambos hablan el mismo protocolo S3-compatible, por lo que dev/CI usan **MinIO** (docker-compose), sin credenciales de ningún proveedor cloud real.
9. **Eliminación y retención**: sin categoría específica en la política de retención ya aprobada; por analogía con "progreso académico: nunca se borra automáticamente", los assets publicados se conservan mientras estén referenciados (Data Model: un asset publicado no se reemplaza silenciosamente). La purga de objetos huérfanos es trabajo de automatización de retención de Fase 2, no de este paso.
10. **Abstracción**: `ObjectStorageService` (ver ajuste 9 del usuario, renombrado desde la propuesta inicial `ContentStorageService`) en `platform/object-storage/` — interfaz mínima de 3 métodos, ningún tipo del SDK de AWS/S3 se expone públicamente. Mismo patrón que `IdentityProvider` (AUTH) y `OutboxService`.

**Recomendación**: Cloudflare R2 (por el punto 7), pero **no se aprovisiona en este paso** (ajuste del usuario) — acción operativa que cuesta dinero y crea infraestructura externa, requiere aprobación explícita y separada cuando el equipo esté listo para subir contenido real.

## Ajustes de aprobación del usuario (incorporados)

1. **Límite de tamaño configurable, no fijo en código.** `OBJECT_STORAGE_MAX_FILE_SIZE_BYTES` (y `_MAX_WIDTH_PX`/`_MAX_HEIGHT_PX`) se leen de `ConfigService` en `resolveUploadLimits()`, con un default documentado **solo como fallback** si la variable no está configurada. Se corrigió un bug real detectado durante la verificación: `ConfigService.get<number>(...)` no convierte el string de `process.env` -- el parámetro de tipo es solo una anotación de TypeScript, no una conversión en tiempo de ejecución. Se agregó `readIntEnv()`, que parsea explícitamente y cae al default si el valor es ausente, vacío o no numérico.
2. **SVG excluido por ahora.** `ALLOWED_MIME_TYPES` = `image/png`, `image/jpeg`, `image/webp` únicamente — un SVG editorial podría contener `<script>`/manejadores de eventos; sanitizarlo con confianza es un problema propio del futuro pipeline editorial de Education, no de la infraestructura de storage.
3. **Bytes mágicos, no solo Content-Type declarado.** `MAGIC_BYTES` verifica la firma real de cada formato permitido (PNG: 8 bytes de firma; JPEG: marcador `FFD8FF`; WebP: `RIFF....WEBP`) antes de aceptar el archivo — un Content-Type mentiroso se rechaza aunque declare un tipo permitido.
4. **Hash SHA-256 calculado y devuelto**, nunca persistido en este paso (no hay entidad donde guardarlo todavía) — lo calculará y persistirá Education cuando exista `educational_asset_version.file_hash` (Data Model 9.11).
5. **Dimensiones máximas validadas** vía `image-size` (dependencia nueva, mínima, sin decodificar la imagen completa — solo lee el header). Se agrega un escenario de prueba (`oversized-dimensions`) que declara dimensiones falsas en el IHDR de un PNG sintético para probar el rechazo sin necesitar un archivo real gigante.
6. **URLs firmadas nunca persistidas.** `ObjectStorageService.getSignedReadUrl()` las genera bajo demanda y las entrega directamente a quien las solicitó -- nunca se escriben en BD, logs o disco. El propio endpoint de diagnóstico verifica el roundtrip completo **internamente** (nunca expone la URL firmada en su respuesta HTTP) para no tener que persistirla ni siquiera transitoriamente en un artefacto de prueba.
7. **Endpoint de diagnóstico completamente autocontenido.** `buildPngFixture()` (`platform/object-storage/test-fixtures.ts`) construye un PNG real (firma + IHDR/IDAT/IEND con CRC32 correcto vía `node:zlib`) enteramente en memoria -- sin depender de ningún archivo externo al repositorio.
8. **Bucket configurable** (`OBJECT_STORAGE_BUCKET`), igual que endpoint y credenciales -- nada fijo en código.
9. **No se aprovisiona Cloudflare R2 en este paso** -- todo el código y el gate se validan contra MinIO; el día que se decida aprovisionar R2, solo cambian variables de entorno.
10. **Renombrado a `ObjectStorageService`** (de la propuesta inicial `ContentStorageService`) -- nombre que describe la infraestructura misma, no el dominio que la consumirá, reforzando el desacople.

## Decisión de diseño adicional (no pedida explícitamente, encontrada durante la implementación)

**Creación de bucket idempotente** (`ensureBucket()`, `HeadBucketCommand` → si falla, `CreateBucketCommand`): dev/CI nunca requiere un paso manual de aprovisionamiento de bucket -- el propio servicio lo crea la primera vez que se usa. Verificado con evidencia real: la réplica de CI (MinIO recién creado, sin bucket previo) mostró en el log `Bucket "axioma-content-ci" creado (no existía).` en el primer roundtrip.

## Alternativas descartadas

- **S3 real (AWS) para dev/CI** -- descartado: requeriría credenciales reales y generaría costo para simplemente ejecutar el gate; MinIO cumple el mismo protocolo sin esa fricción.
- **CDN dedicado ahora** -- descartado: volumen de Fase 1 es deliberadamente pequeño; se revisita cuando haya evidencia real de necesidad.
- **SVG permitido con sanitización básica improvisada** -- descartado: sanitizar SVG correctamente (remover scripts, manejadores de eventos, referencias externas) es un problema no trivial; mejor excluirlo del todo hasta que el pipeline editorial lo necesite con una solución propia.
- **Persistir la URL firmada para reutilizarla** -- descartado explícitamente por el usuario: su propósito es ser de corta duración y desechable.
- **Aprovisionar Cloudflare R2 ya** -- descartado por el usuario: acción operativa con costo real, se hace cuando el equipo esté listo para contenido real.

## Consecuencias

- Education (cuando se implemente) debe usar `ObjectStorageService.putObject`/`getSignedReadUrl`/`deleteObject` exclusivamente -- nunca importar `@aws-sdk/client-s3` directamente. `validateObjectUpload()` debe ejecutarse antes de cualquier `putObject` de contenido real.
- Antes de que Education suba contenido real, hay un Decision Gate operativo pendiente: aprovisionar la cuenta/bucket real de Cloudflare R2 (o confirmar que se mantiene en R2 vs. reconsiderar) -- explícitamente fuera de este ADR.
- Cuando exista `educational_asset_version`, su columna `file_hash` debe poblarse con el `sha256` que `validateObjectUpload()` ya calcula hoy -- no hace falta recalcularlo.
- El límite de tamaño/dimensiones puede ajustarse por ambiente sin desplegar código nuevo (son variables de entorno) -- útil si Education necesita un límite distinto para un tipo de asset específico en el futuro (requeriría extender la configuración, no está previsto todavía).

## Validación (175 heredadas sin regresiones + 22 nuevas de OBJECT-STORAGE)

Ejecutado con seis instancias del backend en puertos separados, contra Postgres de desarrollo + MinIO local, y replicando CI desde cero (Postgres y MinIO efímeros, 6 migraciones sin cambios respecto a ADR-0008, bucket creado desde cero por el propio servicio).

- Gates de AUTH (19), PRIVACY (34), ANALYTICS (34), OBSERVABILITY (43) y USER (33) re-ejecutados: sin regresiones.
- Gate de OBJECT-STORAGE (22 comprobaciones nuevas), incluyendo:
  - Roundtrip completo (subida → hash → URL firmada → descarga → verificación de hash → borrado) con un PNG real generado en memoria.
  - La URL firmada expira realmente pasado su TTL (verificado con una segunda petición tras esperar, no solo documentado).
  - Ningún archivo/valor de una URL firmada aparece en la respuesta del endpoint.
  - Rechazo verificado de: archivo que excede el tamaño configurado, tipo MIME no permitido, bytes mágicos que no coinciden con el Content-Type declarado, dimensiones que exceden el máximo configurado.
  - El endpoint de diagnóstico exige `X-Internal-Ops-Key`.
  - Verificación estática: ningún método público ni la interfaz exportada de `ObjectStorageService` mencionan tipos de `@aws-sdk`.
- `pnpm -r run typecheck/lint`, build de los 3 paquetes, en verde.

**Pendiente no bloqueante**: aprovisionamiento de la cuenta/bucket real de Cloudflare R2 -- explícitamente diferido, no forma parte de este ADR.

**Nota histórica (Bloque V, 2026-08-03)**: el gate de OBJECT-STORAGE, ejecutado dentro del gate consolidado de Bloque V (`scripts/verify-block-v-gate.mjs`, ver `docs/adr/BLOCK-V-CLOSURE-REPORT.md`), falló con `SignatureDoesNotMatch` de MinIO en el escenario válido completo. La investigación con evidencia real (log del backend + comparación explícita contra `docker-compose.yml`) confirmó que `ObjectStorageService` construye el `S3Client` correctamente a partir del entorno, sin lógica propia que romper -- el defecto era que el ORQUESTADOR usaba como *fallback* de `OBJECT_STORAGE_SECRET_ACCESS_KEY` un valor (`axioma_local_password`) que nunca coincidió con `MINIO_ROOT_PASSWORD` real de `docker-compose.yml` (`axioma_dev_password`). Corregido en el orquestador; ni `ObjectStorageService` ni `docker-compose.yml` cambiaron.
