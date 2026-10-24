import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";

export default [
    {
        files: ["**/*.{js,mjs,ts,tsx,astro}"],
    },
    {
        ignores: ["dist/", ".astro/"],
    },
    {
        languageOptions: { globals: globals.browser },
    },
    {
        files: [
            "tests/**/*.ts",
            "e2e/**/*.ts",
            "scripts/**/*.mjs",
            "vitest.config.ts",
            "playwright.config.ts",
        ],
        languageOptions: { globals: globals.node },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommended,
    ...eslintPluginAstro.configs.recommended,
    ...eslintPluginAstro.configs["jsx-a11y-strict"],
];
