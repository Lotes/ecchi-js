import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src"],
      exclude: ["test"],
    },
    deps: {
      interopDefault: true,
    },
    include: ["**/test/**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/out/**", "**/generated/**"],
  },
});
