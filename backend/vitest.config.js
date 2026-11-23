import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.{test,spec}.js"],
    env: {
      NODE_ENV: "test",
      SECRET_KEY: "test_secret_key_for_testing",
      PORT: "9999",
    },
  },
});
