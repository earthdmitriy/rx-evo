/**
 * Turning a **single test file** into a bounded `npm run …` command.
 *
 * `lib/scripts.ts` exposes only whole-suite scripts, and its allowlist is a
 * literal: no free-form shell, no user-supplied arguments. "Run just this
 * spec" therefore needs its own gate. A raw path from the model is *not* a
 * literal, so it is validated here before it ever reaches `spawn`:
 *
 * - relative to the project root, `/` separators only, no drive letter;
 * - characters restricted to `A-Z a-z 0-9 . _ - / @` (no shell metacharacters,
 *   no quotes, no whitespace, so `shell: true` cannot be broken out of);
 * - no `..` segment;
 * - must end with `.spec.ts` or `.test.ts`;
 * - must live in a known test tree, which decides the runner:
 *   `src/**` → Angular unit-test builder (`npm run test -- --include=…`),
 *   `.langflower/nodes/**` → plain Vitest (`npm run test:pack -- <file>`),
 *   because pack tests are not part of `tsconfig.spec.json`.
 *
 * Everything here is pure so `test-targets.test.ts` can prove the rejection
 * cases without spawning anything.
 */

export type TestTargetKind = 'app-spec' | 'pack-test';

export type TestRunPlan = {
	readonly kind: TestTargetKind;
	readonly file: string;
	/** Root script to run. */
	readonly script: string;
	/** Args appended after `npm run <script> --`. */
	readonly args: readonly string[];
};

export type TestTargetResult =
	| { readonly ok: true; readonly plan: TestRunPlan }
	| { readonly ok: false; readonly message: string };

/** Deliberately narrow: no spaces, quotes, `=`, `;`, `$`, backticks, `&`, `|`. */
const SAFE_PATH = /^[A-Za-z0-9._/@-]+$/;

const APP_PREFIX = 'src/';

const PACK_PREFIX = '.langflower/nodes/';

const TEST_FILE = /\.(spec|test)\.ts$/;

const fail = (message: string): TestTargetResult => ({ ok: false, message });

/**
 * Validate a caller-supplied test file and describe the command that runs it.
 * Returns `{ ok: false, message }` for anything the model should fix itself —
 * never throws, so a bad argument cannot abort the agent loop.
 */
export const resolveTestTarget = (raw: unknown): TestTargetResult => {
	if (typeof raw !== 'string') {
		return fail('`file` must be a string path to one test file.');
	}

	const file = raw.trim().replace(/\\/g, '/');

	if (file.length === 0) {
		return fail('`file` is empty. Pass one path, e.g. `src/app/app.component.spec.ts`.');
	}

	if (file.startsWith('/') || /^[A-Za-z]:/.test(file)) {
		return fail(
			`\`${file}\` is absolute. Pass a project-relative path.`,
		);
	}

	if (!SAFE_PATH.test(file)) {
		return fail(
			`\`${file}\` contains characters that are not allowed in a test path. Use letters, digits and . _ - / @ only — no spaces, quotes or shell syntax.`,
		);
	}

	if (file.split('/').includes('..')) {
		return fail(`\`${file}\` must not contain a ".." segment.`);
	}

	if (!TEST_FILE.test(file)) {
		return fail(`\`${file}\` must end with .spec.ts or .test.ts.`);
	}

	if (file.startsWith(APP_PREFIX)) {
		return {
			ok: true,
			plan: {
				kind: 'app-spec',
				file,
				script: 'test:file',
				args: ['--', `--include=${file}`],
			},
		};
	}

	if (file.startsWith(PACK_PREFIX)) {
		return {
			ok: true,
			plan: {
				kind: 'pack-test',
				file,
				script: 'test:pack',
				args: ['--', file],
			},
		};
	}

	return fail(
		`\`${file}\` is outside the known test trees. Expected \`src/**\` (Angular specs) or \`.langflower/nodes/**\` (pack tests).`,
	);
};
