import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/unit/**",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "bun run dev -- --hostname 127.0.0.1",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
      },
});
