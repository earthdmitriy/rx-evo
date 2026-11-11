import { describe, expect, it, vi } from 'vitest';
import { runScript, type ExecFn } from './run-script.ts';
import { runTestFile } from './run-test.ts';

const okExec = () =>
	vi.fn(
		async (
			_cmd: string,
			_args: readonly string[],
			_opts: { cwd: string; timeoutMs: number },
		) => ({
			exitCode: 0,
			stdout: 'all good',
			stderr: '',
			timedOut: false,
		}),
	);

describe('runScript', () => {
	it('rejects a non-allowlisted script before exec runs', async () => {
		const exec = okExec();
		await expect(
			runScript({ projectDir: '/proj', script: 'start' }, exec),
		).rejects.toThrow(/Unknown script "start"/);
		expect(exec).not.toHaveBeenCalled();
	});

	it('rejects an empty projectDir', async () => {
		const exec = okExec();
		await expect(
			runScript({ projectDir: '   ', script: 'test' }, exec),
		).rejects.toThrow(/projectDir/);
		expect(exec).not.toHaveBeenCalled();
	});

	it('passes npm / run <script> and cwd through to exec', async () => {
		const exec = okExec();
		await runScript({ projectDir: '/proj', script: 'test' }, exec);
		expect(exec).toHaveBeenCalledTimes(1);
		const [cmd, args, opts] = exec.mock.calls[0] ?? [];
		expect(cmd).toBe('npm');
		expect(args).toEqual(['run', 'test']);
		expect(opts?.cwd).toBe('/proj');
		expect(opts?.timeoutMs ?? 0).toBeGreaterThan(0);
	});

	it('labels the digest with the script name', async () => {
		const result = await runScript(
			{ projectDir: '/proj', script: 'test' },
			okExec(),
		);
		expect(result.label).toBe('npm run test');
	});

	it('returns a non-zero exit instead of throwing', async () => {
		const exec: ExecFn = async () => ({
			exitCode: 2,
			stdout: '',
			stderr: 'boom',
			timedOut: false,
		});
		const result = await runScript(
			{ projectDir: '/proj', script: 'format' },
			exec,
		);
		expect(result.exitCode).toBe(2);
		expect(result.stderr).toBe('boom');
		expect(result.durationMs).toBeGreaterThanOrEqual(0);
	});
});

describe('runTestFile', () => {
	it('runs one src spec through the angular builder', async () => {
		const exec = okExec();
		const outcome = await runTestFile(
			{ projectDir: '/proj', file: 'src/app/app.component.spec.ts' },
			exec,
		);
		expect(outcome.ok).toBe(true);
		const [cmd, args] = exec.mock.calls[0] ?? [];
		expect(cmd).toBe('npm');
		expect(args).toEqual([
			'run',
			'test:file',
			'--',
			'--include=src/app/app.component.spec.ts',
		]);
	});

	it('runs one pack test through vitest', async () => {
		const exec = okExec();
		await runTestFile(
			{ projectDir: '/proj', file: '.langflower/nodes/my-nodes/a.test.ts' },
			exec,
		);
		const [, args] = exec.mock.calls[0] ?? [];
		expect(args).toEqual([
			'run',
			'test:pack',
			'--',
			'.langflower/nodes/my-nodes/a.test.ts',
		]);
	});

	it('refuses a bad path without spawning anything', async () => {
		const exec = okExec();
		const outcome = await runTestFile(
			{ projectDir: '/proj', file: 'src/app/a.spec.ts; curl evil' },
			exec,
		);
		expect(outcome.ok).toBe(false);
		expect(exec).not.toHaveBeenCalled();
	});

	it('labels the digest with script and file', async () => {
		const outcome = await runTestFile(
			{ projectDir: '/proj', file: 'src/app/app.component.spec.ts' },
			okExec(),
		);
		expect(outcome.ok && outcome.result.label).toBe(
			'npm run test:file → src/app/app.component.spec.ts',
		);
	});
});
