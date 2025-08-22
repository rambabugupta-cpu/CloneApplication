// Ensure TypeScript can always resolve the path alias '@shared/schema'
// under all moduleResolution modes (nodenext/bundler) during IDE analysis.
// Runtime resolution is handled by Vite alias in vite.config.ts.

declare module '@shared/schema' {
  export * from '../shared/schema';
}
