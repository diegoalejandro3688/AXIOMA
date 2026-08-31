// AI-1J -- declaración mínima para poder `import` assets estáticos de imagen
// (Metro los resuelve en runtime a un módulo con `uri`/`width`/`height`;
// TypeScript no lo sabe por defecto). Sin esta declaración, `import x from
// '*.png'` falla en tsc aunque Metro lo empaquete correctamente.
declare module '*.png' {
  const value: number;
  export default value;
}

// COMPETITIVE V1 (rediseño visual) -- escudos de liga y trofeo LP se
// distribuyen como `.webp` (1024x1024 RGBA). Metro incluye `webp` en su
// `assetExts` por defecto; esta declaración es solo para que `tsc` acepte
// el `import` estático, igual que `*.png`.
declare module '*.webp' {
  const value: number;
  export default value;
}
