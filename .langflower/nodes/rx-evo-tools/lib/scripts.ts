/**
 * Single source of truth for the root `package.json` scripts this pack exposes
 * as LLM tools.
 *
 * Only **finite, non-publishing** scripts are allowlisted. A tool call must
 * always return to the model: dev servers (`start`, `watch`) and watch-mode
 * tests (`test:watch`) never exit, and `deploy` publishes to GitHub Pages.
 * `ng` is deliberately omitted as well — it is an unconstrained CLI escape
 * hatch that can start any target (including `serve` / `deploy`). `lint` is
 * excluded because this workspace cannot run it: `angular.json` declares no
 * `lint` architect target, so `npm run lint` fails.
 *
 * Two kinds of entry live here:
 *
 * - **literal** scripts (`argsMode: 'none'`) — `npm run <script>`, no extra
 *   arguments, exposed by `rx_evo_run`.
 * - **file** scripts (`argsMode: 'file'`) — one validated test path appended
 *   after `--`, exposed by `rx_evo_test_file`. The path is gated by
 *   `test-targets.ts`, never taken from the model verbatim.
 *
 * Keep this registry in sync with the root `package.json`. The unit test
 * `scripts.test.ts` asserts `validateAgainstPackageScripts(...)` reports no
 * `missing` and no `extra` names.
 */

export type ScriptKind = 'build' | 'test' | 'format' | 'e2e';

/** `none` — literal, no args. `file` — exactly one validated test path. */
export type ScriptArgsMode = 'none' | 'file';

export type ScriptSpec = {
	readonly name: string;
	readonly summary: string;
	readonly kind: ScriptKind;
	readonly timeoutMs: number;
	readonly argsMode: ScriptArgsMode;
};

/** Long-running / publishing / escape-hatch / non-runnable scripts — never exposed. */
export const EXCLUDED_SCRIPTS: readonly string[] = [
	'ng',
	'start',
	'watch',
	'test:watch',
	'deploy',
	'lint',
] as const;

export const EXCLUSION_REASONS: Readonly<Record<string, string>> = {
	ng: 'Unconstrained Angular CLI escape hatch — it can start `serve`, `deploy`, or a watcher. Use `build`, `test` or `rx_evo_validate` instead.',
	start: 'Dev server (`ng serve`) — never exits, so a tool call would hang.',
	watch: 'Watch-mode build — never exits, so a tool call would hang.',
	'test:watch': 'Watch-mode tests — never exits, so a tool call would hang.',
	deploy: 'Publishes the app to GitHub Pages — a write to the outside world, not an agent step.',
	lint: 'Not runnable here: `angular.json` declares no `lint` target, so `npm run lint` fails with "Cannot find \'lint\' target". Removed from this pack until an ESLint builder is configured.',
};

const LONG_TIMEOUT_MS = 300_000;

const SHORT_TIMEOUT_MS = 120_000;

export const SCRIPT_SPECS: readonly ScriptSpec[] = [
	{
		name: 'build',
		summary:
			'Production Angular build (`ng build`). Use it to prove the app still compiles after a change.',
		kind: 'build',
		timeoutMs: LONG_TIMEOUT_MS,
		argsMode: 'none',
	},
	{
		name: 'test',
		summary:
			'Unit test suite once, no watcher (`ng test --watch=false`).',
		kind: 'test',
		timeoutMs: SHORT_TIMEOUT_MS,
		argsMode: 'none',
	},
	{
		name: 'test:file',
		summary:
			'One `src/**` spec file through the Angular unit-test builder (`ng test --watch=false --include=<file>`). Needs a path after `--`; use `rx_evo_test_file`.',
		kind: 'test',
		timeoutMs: SHORT_TIMEOUT_MS,
		argsMode: 'file',
	},
	{
		name: 'test:pack',
		summary:
			'Vitest over every `.langflower/nodes/**` custom-node pack test (`vitest run`); pass one file after `--` to narrow it (that is what `rx_evo_test_file` does).',
		kind: 'test',
		timeoutMs: SHORT_TIMEOUT_MS,
		argsMode: 'none',
	},
	{
		name: 'format',
		summary:
			'Prettier write over `src/**/*.ts|html|less`. Rewrites files — run it only when formatting is wanted.',
		kind: 'format',
		timeoutMs: SHORT_TIMEOUT_MS,
		argsMode: 'none',
	},
	{
		name: 'e2e',
		summary:
			'Full Playwright end-to-end suite (`playwright test -c e2e/playwright.config.ts`). Slow.',
		kind: 'e2e',
		timeoutMs: LONG_TIMEOUT_MS,
		argsMode: 'none',
	},
	{
		name: 'e2e:smoke',
		summary: 'Playwright smoke subset (`--grep @smoke`).',
		kind: 'e2e',
		timeoutMs: LONG_TIMEOUT_MS,
		argsMode: 'none',
	},
	{
		name: 'e2e:validate',
		summary:
			'Re-runs the contest browser suite once per defect switch (`node e2e/validate-suite.mjs`). SLOW: every run drives Playwright against a dev server on E2E_BASE_URL (default :4200), so it needs a live `npm start`.',
		kind: 'e2e',
		timeoutMs: LONG_TIMEOUT_MS,
		argsMode: 'none',
	},
	{
		name: 'pages:validate',
		summary:
			'Re-runs the page scenario tests once per defect switch (`node src/app/components/contesters/page-tests/validate.mjs`). SLOW: it shells out to the unit-test suite per defect, so it takes minutes.',
		kind: 'e2e',
		timeoutMs: LONG_TIMEOUT_MS,
		argsMode: 'none',
	},
] as const;

/** Allowlisted script names, in registry order. */
export const ALLOWED_SCRIPTS: readonly string[] = SCRIPT_SPECS.map(
	(spec) => spec.name,
);

/** Scripts that take exactly one validated test path after `--`. */
export const FILE_SCRIPTS: readonly string[] = SCRIPT_SPECS.filter(
	(spec) => spec.argsMode === 'file',
).map((spec) => spec.name);

/**
 * Scripts `rx_evo_run` may call with no extra arguments: the literal ones.
 * File scripts stay out — they need the validated path from
 * `rx_evo_test_file`, and an argument-free run would silently cover the suite.
 */
export const LITERAL_SCRIPTS: readonly string[] = SCRIPT_SPECS.filter(
	(spec) => spec.argsMode === 'none',
).map((spec) => spec.name);

export const isAllowedScript = (name: string): boolean =>
	ALLOWED_SCRIPTS.includes(name);

export const isLiteralScript = (name: string): boolean =>
	LITERAL_SCRIPTS.includes(name);

export const getScriptSpec = (name: string): ScriptSpec | undefined =>
	SCRIPT_SPECS.find((spec) => spec.name === name);

export type ScriptSyncReport = {
	readonly missing: readonly string[];
	readonly extra: readonly string[];
};

/**
 * Compare this registry against the scripts declared by the root
 * `package.json`.
 *
 * - `missing` — allowlisted names that the root package no longer declares
 *   (the tool would fail at run time).
 * - `extra` — root scripts covered by neither the allowlist nor
 *   `EXCLUDED_SCRIPTS` (a new script was added and nobody classified it).
 */
export const validateAgainstPackageScripts = (
	scriptNames: readonly string[],
): ScriptSyncReport => {
	const declared = new Set(scriptNames);
	const covered = new Set<string>([...ALLOWED_SCRIPTS, ...EXCLUDED_SCRIPTS]);
	const missing = ALLOWED_SCRIPTS.filter((name) => !declared.has(name));
	const extra = scriptNames.filter((name) => !covered.has(name));
	return { missing, extra };
};

const formatExcluded = (): string =>
	EXCLUDED_SCRIPTS.map(
		(name) => `\`${name}\` (${EXCLUSION_REASONS[name] ?? 'excluded'})`,
	).join(', ');

/**
 * One line per allowlisted script, plus the exclusion note. Intended as the
 * `rx_evo_scripts` tool answer — short and stable, no log content.
 */
export const summarizeScripts = (): string => {
	const lines = SCRIPT_SPECS.map(
		(spec) =>
			`- \`${spec.name}\` (${spec.kind}${
				spec.argsMode === 'file' ? ', takes <file>' : ''
			}) — ${spec.summary}`,
	);
	return [
		`Allowlisted npm scripts (${String(SCRIPT_SPECS.length)}):`,
		...lines,
		`Single-file runs: use \`rx_evo_test_file\` with one \`src/**/*.spec.ts\` or \`.langflower/nodes/**/*.test.ts\` path.`,
		`Excluded (do not run from a tool): ${formatExcluded()}`,
	].join('\n');
};
