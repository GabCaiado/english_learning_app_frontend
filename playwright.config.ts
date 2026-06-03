import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  outputDir: './test-screenshots',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    headless: true,
  },
  projects: [
    {
      name: 'chromium',
      use: { channel: 'chrome' },
    },
  ],
})
