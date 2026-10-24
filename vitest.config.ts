import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.ts"],
        globalSetup: ["tests/setup/build.ts"],
        // The build runs once in globalSetup; page tests only read dist/.
        testTimeout: 10000,
    },
});
