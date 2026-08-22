// AI-1J -- declaración mínima para poder `import` assets estáticos de imagen
// (Metro los resuelve en runtime a un módulo con `uri`/`width`/`height`;
// TypeScript no lo sabe por defecto). Sin esta declaración, `import x from
// '*.png'` falla en tsc aunque Metro lo empaquete correctamente.
declare module '*.png' {
  const value: number;
  export default value;
}
