import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["integration/**/*.test.ts"],
    environment: "node",
    globals: true,
    testTimeout: 30_000,
  },
});
