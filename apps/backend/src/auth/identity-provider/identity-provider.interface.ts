/**
 * Puerto de infraestructura para el proveedor de identidad administrado.
 * Firebase es la implementación actual (ver firebase-identity.provider.ts);
 * ningún otro archivo del dominio AUTH debe importar el SDK de Firebase
 * directamente -- todo pasa por esta interfaz, para poder sustituir el
 * proveedor en el futuro sin tocar el resto del dominio.
 */
export interface VerifiedIdentity {
  /** Identificador estable del proveedor (ej. UID de Firebase). Nunca se usa como clave primaria de Axioma. */
  providerSubject: string;
  email: string;
  emailVerified: boolean;
}

export const IDENTITY_PROVIDER = Symbol('IDENTITY_PROVIDER');

export interface IdentityProvider {
  /** Verifica un token emitido por el proveedor. Lanza si es inválido o expiró. */
  verifyToken(token: string): Promise<VerifiedIdentity>;

  /** Bloquea el login de esa identidad en el proveedor. Reversible. */
  disableUser(providerSubject: string): Promise<void>;

  /** Revierte disableUser. */
  enableUser(providerSubject: string): Promise<void>;

  /** Borrado definitivo en el proveedor. Irreversible. */
  deleteUser(providerSubject: string): Promise<void>;
}
