// typescript-eslint parses and type-checks with TypeScript's JavaScript API, which TypeScript 7 (the native
// compiler `npm run typecheck` uses) no longer has. This workspace gives it TypeScript 6 instead: npm can't
// put both versions at the top level, so it installs typescript-eslint and TypeScript 6 here, and the root
// `overrides` entry keeps ts-api-utils (which would otherwise be hoisted next to TypeScript 7) here too.
// Remove this workspace once typescript-eslint supports TypeScript 7.
export { default } from "typescript-eslint";
