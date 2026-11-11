import { describe, expect, it } from 'vitest';
import { formatCommandResult, type CommandResult } from './run-command.ts';

const makeResult = (overrides: Partial<CommandResult> = {}): CommandResult => ({
	label: 'npm run build',
	exitCode: 0,
	stdout: '',
	stderr: '',
	timedOut: false,
	durationMs: 12,
	...overrides,
});

describe('formatCommandResult', () => {
	it('caps the digest length', () => {
		const text = formatCommandResult(
			makeResult({
				exitCode: 1,
				stderr: 'e'.repeat(50_000),
				stdout: 'o'.repeat(50_000),
			}),
			600,
		);
		expect(text.length).toBeLessThanOrEqual(600);
		expect(text.startsWith('npm run build → exit 1')).toBe(true);
		expect(text).toContain('stderr:');
		// Tail, not head: the truncated stream keeps its end.
		expect(text).toContain('e');
	});

	it('labels a timeout', () => {
		const text = formatCommandResult(
			makeResult({ label: 'npm run e2e', exitCode: 1, timedOut: true }),
		);
		expect(text).toContain('npm run e2e → exit 1 (timed out)');
	});

	it('omits empty sections', () => {
		const text = formatCommandResult(makeResult({ stdout: 'served' }));
		expect(text).toBe('npm run build → exit 0\nstdout:\nserved');
	});

	it('keeps a per-file header readable', () => {
		const text = formatCommandResult(
			makeResult({
				label: 'npm run test:file → src/app/app.component.spec.ts',
				exitCode: 0,
			}),
		);
		expect(text).toBe(
			'npm run test:file → src/app/app.component.spec.ts → exit 0',
		);
	});
});
