import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '../generated/prisma/client';

export const REQUIRED_ADMIN_ROLES = 'requiredAdminRoles';

/**
 * Declara, EN EL SERVIDOR, qué rol exige una ruta administrativa.
 *
 * El mapa rol->operación vive aquí, en el código del backend, y en ningún
 * otro sitio (§9.2: "el mapa rol->transiciones vive en el servidor y es la
 * única fuente de autorización"). El cliente no puede leerlo, negociarlo ni
 * influirlo: solo presenta su token y recibe 200 o 403.
 *
 * Semántica: se exige AL MENOS UNO de los roles listados. Con dos roles en
 * V1 basta con un rol por ruta; la firma admite varios para no tener que
 * reescribir el decorador cuando el Incremento 3 declare que T4 la pueden
 * ejecutar tanto AUTHOR como PUBLISHER (§8.2, transición T4).
 */
export const RequireAdminRole = (...roles: AdminRole[]) => SetMetadata(REQUIRED_ADMIN_ROLES, roles);
