import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@/main", replacement: path.resolve(__dirname, "./src/config.js") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/tests/setup.js"],
    include: ["src/tests/**/*.{test,spec}.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
  },
});
