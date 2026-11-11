import { describe, expect, it } from 'vitest';
import { resolveTestTarget } from './test-targets.ts';

const expectFail = (file: unknown): string => {
	const outcome = resolveTestTarget(file);
	expect(outcome.ok).toBe(false);
	return outcome.ok ? '' : outcome.message;
};

const expectPlan = (file: string) => {
	const outcome = resolveTestTarget(file);
	expect(outcome.ok).toBe(true);
	if (!outcome.ok) {
		throw new Error(outcome.message);
	}
	return outcome.plan;
};

describe('resolveTestTarget', () => {
	it('routes a src spec through the Angular unit-test builder', () => {
		const plan = expectPlan('src/app/app.component.spec.ts');
		expect(plan.kind).toBe('app-spec');
		expect(plan.script).toBe('test:file');
		expect(plan.args).toEqual(['--', '--include=src/app/app.component.spec.ts']);
	});

	it('routes a nested src spec the same way', () => {
		const plan = expectPlan(
			'src/app/components/xprerimental/pagination/pagination.component.spec.ts',
		);
		expect(plan.kind).toBe('app-spec');
		expect(plan.args).toEqual([
			'--',
			'--include=src/app/components/xprerimental/pagination/pagination.component.spec.ts',
		]);
	});

	it('routes a pack test through Vitest', () => {
		const plan = expectPlan('.langflower/nodes/rx-evo-tools/lib/scripts.test.ts');
		expect(plan.kind).toBe('pack-test');
		expect(plan.script).toBe('test:pack');
		expect(plan.args).toEqual([
			'--',
			'.langflower/nodes/rx-evo-tools/lib/scripts.test.ts',
		]);
	});

	it('normalizes Windows separators', () => {
		const plan = expectPlan('src\\app\\app.component.spec.ts');
		expect(plan.file).toBe('src/app/app.component.spec.ts');
		expect(plan.args).toEqual(['--', '--include=src/app/app.component.spec.ts']);
	});

	it('trims surrounding whitespace', () => {
		expect(expectPlan('  src/app/app.component.spec.ts  ').file).toBe(
			'src/app/app.component.spec.ts',
		);
	});

	it('rejects absolute paths', () => {
		expect(expectFail('D:/Win/Projects/rx-evo/src/app/app.component.spec.ts')).toMatch(
			/is absolute/,
		);
		expect(expectFail('/etc/passwd.spec.ts')).toMatch(/is absolute/);
	});

	it('rejects traversal', () => {
		expect(expectFail('src/../../secrets.spec.ts')).toMatch(/"\.\."/);
	});

	it('rejects shell metacharacters', () => {
		for (const path of [
			'src/app/a.spec.ts; rm -rf .',
			'src/app/a.spec.ts && echo pwned',
			'src/app/a b.spec.ts',
			'src/app/$(whoami).spec.ts',
			'src/app/`id`.spec.ts',
			'src/app/a.spec.ts|cat /etc/passwd',
			'src/app/"quoted".spec.ts',
		]) {
			expect(expectFail(path)).toMatch(/not allowed in a test path/);
		}
	});

	it('rejects a file that is not a test file', () => {
		expect(expectFail('src/app/app.component.ts')).toMatch(
			/must end with \.spec\.ts or \.test\.ts/,
		);
	});

	it('rejects a path outside the known test trees', () => {
		expect(expectFail('e2e/smoke.spec.ts')).toMatch(/outside the known test trees/);
		expect(expectFail('docs/example.spec.ts')).toMatch(/outside the known test trees/);
	});

	it('rejects a non-string or empty argument', () => {
		expect(expectFail(undefined)).toMatch(/must be a string/);
		expect(expectFail(42)).toMatch(/must be a string/);
		expect(expectFail('   ')).toMatch(/`file` is empty/);
	});

	it('never throws for hostile input', () => {
		for (const input of ['\0', '\n', 'src/app/\0.spec.ts', null, {}, []]) {
			expect(() => resolveTestTarget(input)).not.toThrow();
			expect(resolveTestTarget(input).ok).toBe(false);
		}
	});
});
