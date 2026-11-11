import {
	ALLOWED_SCRIPTS,
	getScriptSpec,
	isAllowedScript,
} from './scripts.ts';
import {
	formatCommandResult,
	runCommand,
	type CommandResult,
	type ExecFn,
} from './run-command.ts';

/**
 * `npm run <allowlisted-script>` — the whole-suite tools.
 *
 * The allowlist itself lives in `scripts.ts`; the spawn + digest pipeline lives
 * in `run-command.ts` and is shared with `run-test.ts`.
 */

export type ScriptResult = CommandResult;

export type RunOptions = {
	readonly projectDir: string;
	readonly script: string;
	readonly timeoutMs?: number;
};

/** Re-exported for tests and callers that inject a fake process runner. */
export type { ExecFn };

/**
 * Run one allowlisted script in `projectDir`.
 *
 * Throws only for caller mistakes — no `projectDir`, or a script outside the
 * allowlist. The allowlist is a literal: no user-supplied extra args, no
 * free-form shell. A non-zero exit or a timeout is a normal {@link ScriptResult}.
 */
export const runScript = async (
	options: RunOptions,
	exec?: ExecFn,
): Promise<ScriptResult> => {
	const script =
		typeof options.script === 'string' ? options.script.trim() : '';
	if (!isAllowedScript(script)) {
		throw new Error(
			`Unknown script "${script}". Allowed: ${ALLOWED_SCRIPTS.join(', ')}.`,
		);
	}

	const spec = getScriptSpec(script);

	return runCommand(
		{
			projectDir: options.projectDir,
			label: `npm run ${script}`,
			cmd: 'npm',
			args: ['run', script],
			timeoutMs: options.timeoutMs ?? spec?.timeoutMs,
		},
		exec,
	);
};

/**
 * Agent-readable digest of a run: one header line (`npm run <script> → exit N`),
 * then the **tail** of stderr / stdout, capped at `maxChars` in total.
 */
export const formatScriptResult = (
	result: ScriptResult,
	maxChars?: number,
): string => formatCommandResult(result, maxChars);
