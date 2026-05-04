import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración global de Playwright para Docqee.
 * Entorno por defecto: https://docqee.vercel.app/
 *
 * Para sobrescribir la URL:
 *   BASE_URL=http://localhost:5173 npx playwright test
 */

// Genera un timestamp para nombrar la carpeta del blob-report: blob-report-YYYYMMDD-HHmmss
function getBlobReportFolder() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `Historial_reports/blob-report-${stamp}`;
}

export default defineConfig({
  testDir: './e2e',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['blob', { outputDir: getBlobReportFolder() }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'https://docqee.vercel.app',

    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    viewport: { width: 1280, height: 720 },
    actionTimeout: 15_000,
    navigationTimeout: 20_000,
  },

  projects: [
    {
      name: 'setup',
      testMatch: /setup\/auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],

  timeout: 45_000,
  globalTimeout: 1_800_000,
});
