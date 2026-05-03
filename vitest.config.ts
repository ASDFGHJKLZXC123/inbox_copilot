import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.test.ts", "**/*.spec.ts"],
    exclude: ["node_modules", ".next", "tests/contrast/**"],
    setupFiles: ["./vitest.setup.ts"]
  }
});
