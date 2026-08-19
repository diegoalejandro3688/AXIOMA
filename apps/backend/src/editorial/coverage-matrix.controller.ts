import { Controller, Get, UseGuards } from '@nestjs/common';
import { contentCoverageMatrixResponseSchema, type ContentCoverageMatrixResponse } from '@axioma/contracts';
import { AdminAuthGuard } from '../administration/admin-auth.guard';
import { AdminRoleGuard } from '../administration/admin-role.guard';
import { RequireAdminRole } from '../administration/require-admin-role.decorator';
import { ContentCoverageService } from '../education/content-coverage.service';

/**
 * `GET /administration/editorial/coverage-matrix` -- Content Coverage Matrix.
 * LEF Bloque VII, Incremento 5. Ver LEF-BLOCK-VII-DEFINITION.md §12.5
 * (frontera), §13.5 (criterios de cierre), decisión E (§4) e invariante 14.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ UN CONTROLLER Y UN MÓDULO PROPIOS, Y NO UNA RUTA MÁS EN
 * `editorial.controller.ts`
 * ---------------------------------------------------------------------------
 * §13.5 punto 4 exige verificar que "el MÓDULO de la matriz no expone ningún
 * método HTTP distinto de `GET` y no invoca ninguna operación de escritura en
 * ningún repositorio". `editorial.controller.ts` expone `@Post` y `@Patch`
 * (T1, T2 y las transiciones T3..T8): alojar la matriz allí haría ese criterio
 * literalmente inverificable. La separación física del módulo ES el mecanismo
 * por el que el invariante 14 se puede comprobar de forma estática.
 *
 * Efecto colateral deseado: la aserción del gate del Incremento 3 ("el
 * controller editorial NO expone la Content Coverage Matrix") sigue siendo
 * VERDADERA sin tocarla, y pasa de ser una frontera temporal entre incrementos
 * a ser una garantía permanente de separación entre la superficie de lectura y
 * la de escritura.
 *
 * ---------------------------------------------------------------------------
 * PERMISOS -- §9.2 y §7.2
 * ---------------------------------------------------------------------------
 * `@RequireAdminRole('AUTHOR', 'PUBLISHER')`. No es una laxitud: §9.2 concede
 * "leer la Content Coverage Matrix" a AMBOS roles de forma literal, y §7.2 lo
 * repite en las dos filas de la tabla de trust boundaries. Lo que NO se
 * concede es acceso sin rol: un actor administrativo autenticado sin ninguno
 * de los dos roles es rechazado, igual que en el resto de la superficie.
 *
 * ---------------------------------------------------------------------------
 * FRONTERA -- lo que este controller NO hace
 * ---------------------------------------------------------------------------
 *  - CERO escritura: ni `@Post`, ni `@Put`, ni `@Patch`, ni `@Delete`. Un solo
 *    `@Get` en todo el archivo (invariante 14).
 *  - NO registra ninguna acción administrativa en `admin_action`. §9.3 define
 *    ese registro como "un registro por cada operación editorial QUE CAMBIA
 *    ALGO", y leer la cobertura no cambia nada; escribir una fila por cada
 *    lectura sería, además, exactamente la ruta de escritura que el invariante
 *    14 prohíbe introducir. El acceso SÍ queda registrado, pero en
 *    `admin_access_log`, por el guard del Incremento 2 -- sin nada nuevo aquí.
 *  - NO acepta ninguna clave de idempotencia: no hay efecto que repetir
 *    (invariante 11 aplica a operaciones que cambian estado).
 *  - NO expone `AnswerOption.isCorrect` ni ningún contenido académico.
 *  - NO devuelve NINGÚN dato de `Account`, `StudentResponse`,
 *    `AiConversation`, `AiMessage` ni de PROGRESS/GAMIFICATION/PRIVACY
 *    (§11.4). Este archivo no importa nada de esos dominios.
 *  - NO usa `InternalOpsGuard` (decisión B) ni `AuthGuard` (sesión de
 *    estudiante). Reutiliza la identidad administrativa del Incremento 2 sin
 *    reimplementar ni un byte de ella.
 *  - NO importa ningún repositorio de EDUCATION (invariante 15): solicita al
 *    servicio de dominio, que es el dueño de esas tablas.
 *  - NO importa contenido (CMS-026..029, diferido) y NO construye vista previa
 *    (CMS-007, diferido por decisión D).
 */
@Controller('administration/editorial/coverage-matrix')
@UseGuards(AdminAuthGuard, AdminRoleGuard)
export class CoverageMatrixController {
  constructor(private readonly coverage: ContentCoverageService) {}

  /**
   * Matriz completa. Se recorta con el esquema del contrato antes de salir:
   * lo que no esté declarado allí no puede filtrarse por accidente, mismo
   * criterio que `adminMeResponseSchema` en el Incremento 2.
   */
  @Get()
  @RequireAdminRole('AUTHOR', 'PUBLISHER')
  async matrix(): Promise<ContentCoverageMatrixResponse> {
    const matrix = await this.coverage.buildMatrix();
    return contentCoverageMatrixResponseSchema.parse(matrix);
  }
}
