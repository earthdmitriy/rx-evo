import { getScriptSpec } from './scripts.ts';
import { runCommand, type CommandResult, type ExecFn } from './run-command.ts';
import { resolveTestTarget, type TestTargetResult } from './test-targets.ts';

/**
 * Run **one** test file — the specific-test path that the whole-suite
 * `npm run test` / `npm run test:pack` tools cannot express.
 *
 * The file is validated by `test-targets.ts` (relative, safe characters, known
 * test tree, `*.spec.ts` / `*.test.ts`) *before* anything is spawned. Only the
 * script name and the single validated path reach the shell — the allowlist
 * stays a literal.
 */

export type FileRunOptions = {
	readonly projectDir: string;
	/** Raw, untrusted `file` argument from the tool call. */
	readonly file: unknown;
	readonly timeoutMs?: number;
};

export type FileRunResult =
	| { readonly ok: true; readonly result: CommandResult }
	| { readonly ok: false; readonly message: string };

export { type TestTargetResult }

/** Validate the path and return the plan, without running anything. */
export const planTestFile = (file: unknown): TestTargetResult =>
	resolveTestTarget(file);

/**
 * Validate and run one test file. A bad path returns `{ ok: false, message }`
 * (a caller mistake the model can fix); a non-zero exit is a normal
 * {@link CommandResult}.
 */
export const runTestFile = async (
	options: FileRunOptions,
	exec?: ExecFn,
): Promise<FileRunResult> => {
	const planned = resolveTestTarget(options.file);
	if (!planned.ok) {
		return planned;
	}

	const spec = getScriptSpec(planned.plan.script);

	const result = await runCommand(
		{
			projectDir: options.projectDir,
			label: `npm run ${planned.plan.script} → ${planned.plan.file}`,
			cmd: 'npm',
			args: ['run', planned.plan.script, ...planned.plan.args],
			timeoutMs: options.timeoutMs ?? spec?.timeoutMs,
		},
		exec,
	);

	return { ok: true, result };
};
