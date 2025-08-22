// Shim declaration to satisfy editor when resolving drizzle-orm/node-postgres
// until TypeScript picks up the package's export map correctly
declare module 'drizzle-orm/node-postgres' {
  export * from 'drizzle-orm';
}
