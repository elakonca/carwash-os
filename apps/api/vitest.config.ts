import { defineConfig } from "vitest/config";

const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://carwash:carwash@localhost:5432/carwash_test";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: databaseUrl,
      JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET ?? "test-access-secret-min-32-chars",
      JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET ?? "test-refresh-secret-min-32-chars",
      WEB_ORIGIN: "http://localhost:5173",
      NODE_ENV: "test",
      COOKIE_SECURE: "false",
      UPLOAD_DIR: "./uploads",
    },
  },
});
