import { defineConfig } from 'vitest/config';

/**
 * Vitest scope for custom-node **pack tests** under `.langflower/nodes/`.
 *
 * The Angular unit-test builder owns `src/**` (`src/setupVitest.ts`, jsdom,
 * `tsconfig.spec.json`). A bare root `vitest run` would pull those specs in
 * without that setup, so pack tests get their own config and their own root
 * script (`test:pack`).
 *
 * `root` stays the workspace root on purpose: an explicit positional file from
 * `rx_evo_test_file` is matched relative to the invocation directory, so a
 * path like `.langflower/nodes/rx-evo-tools/lib/scripts.test.ts` filters
 * correctly.
 *
 * `*.nodes.test.ts` is excluded: those files import the SDK test harness
 * (`@langflower/node-sdk/testing`), which only resolves after
 * `npm install` inside that pack. Packs in this workspace are peer-only
 * (no `node_modules`), so the default `test:pack` would fail on an import,
 * not on an assertion. Run one such file after installing the pack's deps.
 */
const WORKSPACE_ROOT = new URL('../..', import.meta.url);

export default defineConfig({
	root: WORKSPACE_ROOT.pathname.replace(/^\/([A-Za-z]:)/, '$1'),
	test: {
		environment: 'node',
		include: ['.langflower/nodes/**/*.test.ts'],
		exclude: ['**/node_modules/**', '**/*.nodes.test.ts'],
	},
});
