import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(process.cwd(), "src"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    projects: [
      {
        resolve: { alias },
        test: {
          name: "application",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/**/*.db.test.ts"],
          environment: "jsdom",
          setupFiles: ["src/test/setup.ts"],
        },
      },
      {
        resolve: { alias },
        test: {
          name: "database",
          include: ["src/**/*.db.test.ts"],
          environment: "node",
          setupFiles: ["src/test/setup.ts"],
        },
      },
    ],
  },
});
