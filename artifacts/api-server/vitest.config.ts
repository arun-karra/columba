import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      SESSION_SECRET: "test-session-secret",
      NODE_ENV: "test",
      DEV_BYPASS_CODE: "test-bypass-secret",
    },
  },
});
