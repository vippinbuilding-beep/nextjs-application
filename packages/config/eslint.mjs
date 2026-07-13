import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

/**
 * Shared Next.js eslint config, extended by each app's eslint.config.mjs.
 * `baseDirectory` must point at the app calling this (not this package), so
 * callers pass their own `import.meta.url`.
 */
export function nextEslintConfig(importMetaUrl) {
  const __filename = fileURLToPath(importMetaUrl);
  const __dirname = dirname(__filename);

  const compat = new FlatCompat({ baseDirectory: __dirname });

  return [...compat.extends("next/core-web-vitals", "next/typescript")];
}
