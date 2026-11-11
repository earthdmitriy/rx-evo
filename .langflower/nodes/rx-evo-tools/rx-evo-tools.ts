import { defineToolRegistrations } from '@langflower/node-sdk';
import {
	ALLOWED_SCRIPTS,
	LITERAL_SCRIPTS,
	summarizeScripts,
} from './lib/scripts.ts';
import { formatCommandResult } from './lib/run-command.ts';
import { formatScriptResult, runScript } from './lib/run-script.ts';
import { runTestFile } from './lib/run-test.ts';

const VALIDATION_SUITES = [
	'e2e',
	'e2e:smoke',
	'e2e:validate',
	'pages:validate',
] as const;

const allowedList = LITERAL_SCRIPTS.join(', ');

const suiteList = VALIDATION_SUITES.join(', ');

const FILE_HINT =
	'Pass one project-relative path ending in .spec.ts or .test.ts: `src/**` runs through the Angular unit-test builder, `.langflower/nodes/**` runs through Vitest.';

const known = (value: unknown, names: readonly string[]): string | undefined =>
	typeof value === 'string' && names.includes(value) ? value : undefined;

const readProjectDir = (ctx: { readonly projectDir?: unknown }): string =>
	String(ctx.projectDir ?? '').trim();

/**
 * One tool call → one bounded `npm` command → one capped digest.
 *
 * Never throws: the model gets readable text back for both a failing command
 * and a caller mistake, so the agent loop is never aborted by a red build.
 * The allowlist itself lives in `lib/scripts.ts`.
 */
const runToolScript = async (
	ctx: { readonly projectDir?: unknown },
	script: string,
): Promise<string> => {
	const projectDir = readProjectDir(ctx);
	if (projectDir.length === 0) {
		return 'No project directory is available for this tool call.';
	}

	try {
		const result = await runScript({ projectDir, script });
		return formatScriptResult(result);
	} catch (err) {
		return (
			'Tool call failed: ' +
			(err instanceof Error ? err.message : String(err))
		);
	}
};

/**
 * LLM tool pack — wire the `tools` output into an agent / LLM `tools` port.
 *
 * Only finite, non-publishing root scripts are exposed (`lib/scripts.ts`).
 * `ng`, `start`, `watch`, `test:watch` and `deploy` stay out: a tool call must
 * always return to the model, and publishing is a human decision.
 *
 * `rx_evo_test_file` runs **one** spec/test file. Its path is validated by
 * `lib/test-targets.ts` before spawn (relative, safe characters, known test
 * tree), so the "no free-form shell" rule still holds.
 *
 * Shell is not on the public ExecutionContext yet — the runner uses
 * `child_process` directly. Prefer Caps / host APIs when they ship.
 */
export default defineToolRegistrations({
	type: 'rx-evo-tools',
	displayName: 'rx-evo Tools',
	category: 'Logic',
	description:
		'Emits allowlisted `npm run` ToolHandles for this repository — build, test, e2e, the validators, and single-file test runs. Hanging dev/watcher scripts, `deploy`, and `lint` (no `lint` architect target in this workspace) are excluded, and every call returns a capped digest instead of a raw log.',
	tools: [
		{
			toolId: 'rx_evo_scripts',
			name: 'rx_evo_scripts',
			description:
				'Lists the root npm scripts this pack may run, one line each, plus the excluded scripts and why. Call it before picking a script.',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false,
			},
			handler: async () => summarizeScripts(),
		},
		{
			toolId: 'rx_evo_run',
			name: 'rx_evo_run',
			description: `Runs one allowlisted root npm script (\`npm run <script>\`) in the project directory and returns a short digest: exit code, then the tail of stderr/stdout. Only argument-free scripts are accepted here: ${allowedList}. To run one test file, use \`rx_evo_test_file\`. Registered scripts: ${ALLOWED_SCRIPTS.join(', ')}.`,
			inputSchema: {
				type: 'object',
				properties: {
					script: {
						type: 'string',
						enum: [...LITERAL_SCRIPTS],
						description: `Script to run. One of: ${allowedList}.`,
					},
				},
				required: ['script'],
				additionalProperties: false,
			},
			handler: async (args, ctx) => {
				const script = known(args['script'], LITERAL_SCRIPTS);
				if (script === undefined) {
					return (
						'Unknown script "' +
						String(args['script']) +
						'". Allowed: ' +
						allowedList +
						'. For a single test file use `rx_evo_test_file`.'
					);
				}
				return runToolScript(ctx, script);
			},
		},
		{
			toolId: 'rx_evo_test',
			name: 'rx_evo_test',
			description:
				'Runs the whole unit test suite once (`npm run test`, no watcher) and returns the exit code with the tail of the output. For one file, use `rx_evo_test_file`.',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false,
			},
			handler: async (_args, ctx) => runToolScript(ctx, 'test'),
		},
		{
			toolId: 'rx_evo_test_file',
			name: 'rx_evo_test_file',
			description: `Runs **one** test file and returns the exit code with the tail of the output. ${FILE_HINT} Anything else is rejected without running.`,
			inputSchema: {
				type: 'object',
				properties: {
					file: {
						type: 'string',
						description:
							'Project-relative test path, e.g. `src/app/app.component.spec.ts` or `.langflower/nodes/rx-evo-tools/lib/scripts.test.ts`.',
					},
				},
				required: ['file'],
				additionalProperties: false,
			},
			handler: async (args, ctx) => {
				const projectDir = readProjectDir(ctx);
				if (projectDir.length === 0) {
					return 'No project directory is available for this tool call.';
				}

				try {
					const outcome = await runTestFile({
						projectDir,
						file: args['file'],
					});
					if (!outcome.ok) {
						return outcome.message;
					}
					return formatCommandResult(outcome.result);
				} catch (err) {
					return (
						'Tool call failed: ' +
						(err instanceof Error ? err.message : String(err))
					);
				}
			},
		},
		{
			toolId: 'rx_evo_build',
			name: 'rx_evo_build',
			description:
				'Runs the production Angular build (`npm run build`) and returns the exit code with the tail of the output.',
			inputSchema: {
				type: 'object',
				properties: {},
				additionalProperties: false,
			},
			handler: async (_args, ctx) => runToolScript(ctx, 'build'),
		},
		{
			toolId: 'rx_evo_validate',
			name: 'rx_evo_validate',
			description: `Runs one validation suite and returns the exit code with the tail of the output. Requires \`suite\`: one of ${suiteList}. All four are slow: \`e2e:validate\` re-runs the Playwright contest suite once per defect (needs a dev server on E2E_BASE_URL), \`pages:validate\` re-runs the unit-test scenarios once per defect. Expect minutes, and prefer \`rx_evo_test_file\` while iterating.`,
			inputSchema: {
				type: 'object',
				properties: {
					suite: {
						type: 'string',
						enum: [...VALIDATION_SUITES],
						description: `Validation suite to run: ${suiteList}.`,
					},
				},
				required: ['suite'],
				additionalProperties: false,
			},
			handler: async (args, ctx) => {
				const suite = known(args['suite'], VALIDATION_SUITES);
				if (suite === undefined) {
					return (
						'Unknown suite "' +
						String(args['suite']) +
						'". Allowed: ' +
						suiteList +
						'.'
					);
				}
				return runToolScript(ctx, suite);
			},
		},
	],
});
