import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
// typescript-eslint, with the TypeScript 6 it needs (see tools/typescript-eslint/index.js).
import tseslint from "typescript-eslint-ts6";

export default defineConfig(
  globalIgnores(["build/", ".vite/", "public/", "notes/"]),
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Messages are built from numbers all the time ("7 holes", "±0.5 mm").
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      // `onClick={() => setOpen(false)}` is the React idiom; the rule still checks other void misuse.
      "@typescript-eslint/no-confusing-void-expression": ["error", { ignoreArrowShorthand: true }],
      // `a || b` on booleans is a logical or, not a default; `??` would change its meaning.
      "@typescript-eslint/prefer-nullish-coalescing": ["error", { ignorePrimitives: { boolean: true } }],
      // Both are used on purpose: parameter types are `type` aliases so they fit ParamValues
      // (an interface has no index signature), other shapes are interfaces.
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
  {
    files: ["src/**"],
    extends: [reactHooks.configs.flat["recommended-latest"]],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["tests/**", "scripts/**", "tools/**", "*.config.*"],
    languageOptions: { globals: globals.node },
  },
  {
    // These run in Node and hand some functions to the page.
    files: ["e2e/**", "scripts/screenshots.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    // A test failing on `undefined` says as much as a check would.
    files: ["tests/**"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
  {
    files: ["**/*.js", "**/*.mjs"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
