import { defineConfig } from '@playwright/test';
import { selectedTargets } from './targets';

const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

/** Smoke runs (`--grep @smoke`) skip scenarios of stages above E2E_STAGE. */
const smokeStage = process.argv.includes('@smoke') ? Number(process.env['E2E_STAGE'] ?? 3) : 3;
const laterStages = smokeStage < 3 ? new RegExp(`@s[${smokeStage + 1}-3]`) : undefined;

/**
 * The contest suite (docs/contest/methodology.md §3): every scenario of every
 * stage runs against every target; the reporter sorts results by stage.
 * `npm run e2e:smoke` runs only `@smoke` tests up to E2E_STAGE.
 */
export default defineConfig({
  testDir: './specs',
  outputDir: './.results',
  fullyParallel: false,
  workers: 1,
  timeout: 10_000,
  expect: { timeout: 3_000 },
  reporter: [['list'], ['./reporters/contest-reporter.ts']],
  grepInvert: laterStages,
  use: {
    baseURL,
    channel: 'chrome',
    viewport: { width: 1600, height: 1000 },
    trace: 'retain-on-failure',
  },
  projects: selectedTargets().map((target) => ({ name: target.id, use: { target } })),
  webServer: {
    command: `npm start -- --port ${new URL(baseURL).port || 4200}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
