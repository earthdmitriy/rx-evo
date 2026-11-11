import { spawn } from 'node:child_process';

/**
 * Generic, pure, testable command runner behind the rx-evo tools.
 *
 * Everything that touches the OS lives behind the injectable {@link ExecFn}, so
 * unit tests can assert the shell contract without spawning anything.
 *
 * Callers (`run-script.ts` for root scripts, `run-test.ts` for one test file)
 * are responsible for *what* runs. This module only spawns it and turns the
 * result into a capped digest.
 *
 * Windows note: `npm` is `npm.cmd`, which `spawn` cannot execute without a
 * shell. Like seed `my-nodes/review-gate.ts`, the command is passed as a single
 * string with `shell: true`, never as an `npm.cmd` literal.
 */

export type CommandResult = {
	/** Short label shown in the digest header, e.g. `test`. */
	readonly label: string;
	readonly exitCode: number;
	readonly stdout: string;
	readonly stderr: string;
	readonly timedOut: boolean;
	readonly durationMs: number;
};

export type CommandOptions = {
	readonly projectDir: string;
	/** Short label for the digest header; never a full command line. */
	readonly label: string;
	readonly cmd: string;
	readonly args: readonly string[];
	readonly timeoutMs?: number;
};

export type ExecFn = (
	cmd: string,
	args: readonly string[],
	opts: { cwd: string; timeoutMs: number },
) => Promise<{
	exitCode: number;
	stdout: string;
	stderr: string;
	timedOut: boolean;
}>;

/** Per-stream capture cap — a failing build must not flood the model. */
const MAX_STREAM_CHARS = 64 * 1024;

const DEFAULT_FORMAT_CHARS = 4_000;

const DEFAULT_TIMEOUT_MS = 120_000;

const appendCapped = (current: string, chunk: string): string => {
	if (current.length >= MAX_STREAM_CHARS) {
		return current;
	}
	const next = current + chunk;
	return next.length > MAX_STREAM_CHARS
		? next.slice(0, MAX_STREAM_CHARS)
		: next;
};

/**
 * `child_process.spawn` with `shell: true` and `windowsHide: true`.
 * Resolves on `close` (never rejects for a non-zero exit); rejects only when
 * the child cannot be started at all (`error` event).
 */
export const defaultExec: ExecFn = (cmd, args, opts) =>
	new Promise((resolve, reject) => {
		const command = [cmd, ...args].join(' ');
		const child = spawn(command, {
			cwd: opts.cwd,
			shell: true,
			windowsHide: true,
		});

		let stdout = '';
		let stderr = '';
		let timedOut = false;
		let settled = false;

		const timer = setTimeout(() => {
			timedOut = true;
			// `shell: true` means `child.kill()` only kills the shell — a
			// grandchild (npm → ng → vitest, playwright) would keep running and
			// hold the port / CPU. Kill the whole tree on Windows.
			if (process.platform === 'win32' && child.pid !== undefined) {
				spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
					windowsHide: true,
				});
			}
			child.kill();
		}, opts.timeoutMs);

		const finish = (
			value:
				| {
						exitCode: number;
						stdout: string;
						stderr: string;
						timedOut: boolean;
				  }
				| undefined,
			error?: unknown,
		): void => {
			if (settled) {
				return;
			}
			settled = true;
			clearTimeout(timer);
			if (value === undefined) {
				reject(error);
				return;
			}
			resolve(value);
		};

		child.stdout?.on('data', (chunk: Buffer | string) => {
			stdout = appendCapped(stdout, String(chunk));
		});
		child.stderr?.on('data', (chunk: Buffer | string) => {
			stderr = appendCapped(stderr, String(chunk));
		});
		child.on('error', (error) => {
			finish(undefined, error);
		});
		child.on('close', (code) => {
			finish({
				exitCode: code ?? 1,
				stdout,
				stderr,
				timedOut,
			});
		});
	});

const resolveTimeout = (override?: number): number => {
	if (
		typeof override === 'number' &&
		Number.isFinite(override) &&
		override > 0
	) {
		return Math.floor(override);
	}
	return DEFAULT_TIMEOUT_MS;
};

/**
 * Run one already-decided command in `projectDir`.
 *
 * Throws only for caller mistakes — no `projectDir`, no `cmd`. A non-zero exit
 * or a timeout is a normal {@link CommandResult}: the model reads the failure
 * and decides the next step.
 */
export const runCommand = async (
	options: CommandOptions,
	exec: ExecFn = defaultExec,
): Promise<CommandResult> => {
	const projectDir =
		typeof options.projectDir === 'string' ? options.projectDir.trim() : '';
	if (projectDir.length === 0) {
		throw new Error('runCommand requires a non-empty projectDir.');
	}

	const cmd = typeof options.cmd === 'string' ? options.cmd.trim() : '';
	if (cmd.length === 0) {
		throw new Error('runCommand requires a non-empty cmd.');
	}

	const timeoutMs = resolveTimeout(options.timeoutMs);
	const startedAt = Date.now();
	const outcome = await exec(cmd, options.args, {
		cwd: projectDir,
		timeoutMs,
	});

	return {
		label: options.label,
		exitCode: outcome.exitCode,
		stdout: outcome.stdout,
		stderr: outcome.stderr,
		timedOut: outcome.timedOut,
		durationMs: Date.now() - startedAt,
	};
};

const clampTail = (text: string, budget: number): string => {
	if (budget <= 0) {
		return '';
	}
	if (text.length <= budget) {
		return text;
	}
	if (budget <= 1) {
		return text.slice(-budget);
	}
	return `…${text.slice(-(budget - 1))}`;
};

type Section = { readonly text: string; readonly used: number };

const makeSection = (
	label: string,
	text: string,
	allowance: number,
): Section => {
	const body = text.trim();
	const prefix = `${label}:\n`;
	if (body.length === 0 || allowance <= prefix.length) {
		return { text: '', used: 0 };
	}
	const clamped = clampTail(body, allowance - prefix.length);
	return { text: `${prefix}${clamped}`, used: prefix.length + clamped.length };
};

/**
 * Agent-readable digest of a run: one header line, then the **tail** of
 * stderr / stdout, capped at `maxChars` in total. Never the whole log —
 * a failing Angular build is hundreds of KB of progress spam.
 *
 * A non-zero exit or a timeout is returned as text, not thrown: the model
 * should read the failure and decide the next step.
 */
export const formatCommandResult = (
	result: CommandResult,
	maxChars = DEFAULT_FORMAT_CHARS,
): string => {
	const header = `${result.label} → exit ${String(result.exitCode)}${
		result.timedOut ? ' (timed out)' : ''
	}`;

	const cap = Number.isFinite(maxChars)
		? Math.max(0, Math.floor(maxChars))
		: DEFAULT_FORMAT_CHARS;

	// Reserve the newline after the header plus one separator between sections.
	const bodyBudget = Math.max(0, cap - header.length - 2);

	const sections: string[] = [];
	let remaining = bodyBudget;

	const stderrShare = Math.min(remaining, Math.ceil(bodyBudget * 0.6));
	const stderrSection = makeSection('stderr', result.stderr, stderrShare);
	remaining -= stderrSection.used;
	if (stderrSection.text.length > 0) {
		sections.push(stderrSection.text);
	}

	const stdoutSection = makeSection('stdout', result.stdout, remaining);
	if (stdoutSection.text.length > 0) {
		sections.push(stdoutSection.text);
	}

	if (sections.length === 0) {
		return header;
	}
	return `${header}\n${sections.join('\n')}`;
};
