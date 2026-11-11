import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
	ALLOWED_SCRIPTS,
	EXCLUDED_SCRIPTS,
	EXCLUSION_REASONS,
	FILE_SCRIPTS,
	getScriptSpec,
	isAllowedScript,
	isLiteralScript,
	LITERAL_SCRIPTS,
	SCRIPT_SPECS,
	summarizeScripts,
	validateAgainstPackageScripts,
} from './scripts.ts';

type RootPackageJson = { scripts?: Record<string, string> };

const readRootPackageScripts = (): readonly string[] => {
	const url = new URL('../../../../package.json', import.meta.url);
	const raw = readFileSync(fileURLToPath(url), 'utf8');
	const parsed = JSON.parse(raw) as RootPackageJson;
	return Object.keys(parsed.scripts ?? {});
};

describe('script allowlist', () => {
	it('never exposes hanging or publishing scripts', () => {
		for (const excluded of ['start', 'watch', 'test:watch', 'deploy']) {
			expect(ALLOWED_SCRIPTS).not.toContain(excluded);
		}
	});

	it('drops `lint`, which this workspace cannot run', () => {
		// `angular.json` has no `lint` architect target, so `npm run lint`
		// fails with "Cannot find 'lint' target". Excluding it keeps the
		// registry honest instead of offering a tool that always fails.
		expect(ALLOWED_SCRIPTS).not.toContain('lint');
		expect(EXCLUDED_SCRIPTS).toContain('lint');
		expect(EXCLUSION_REASONS['lint']).toContain('Cannot find');
		expect(isAllowedScript('lint')).toBe(false);
		expect(getScriptSpec('lint')).toBeUndefined();
	});

	it('describes every allowed script', () => {
		for (const name of ALLOWED_SCRIPTS) {
			const spec = getScriptSpec(name);
			expect(spec).toBeDefined();
			expect(spec?.summary.trim().length ?? 0).toBeGreaterThan(0);
			expect(spec?.timeoutMs ?? 0).toBeGreaterThan(0);
		}
		expect(SCRIPT_SPECS.length).toBe(ALLOWED_SCRIPTS.length);
	});

	it('gates membership in both directions', () => {
		expect(isAllowedScript('test')).toBe(true);
		expect(isAllowedScript('start')).toBe(false);
		expect(isAllowedScript('')).toBe(false);
	});

	it('splits literal scripts from file scripts', () => {
		expect(LITERAL_SCRIPTS).toContain('test');
		expect(LITERAL_SCRIPTS).toContain('build');
		// `test:file` needs a validated path; `rx_evo_run` must not take it.
		expect(LITERAL_SCRIPTS).not.toContain('test:file');
		expect(isLiteralScript('test:file')).toBe(false);
		// `test:pack` is a whole-pack suite on its own, and also accepts a file.
		expect(LITERAL_SCRIPTS).toContain('test:pack');
		expect(FILE_SCRIPTS).toEqual(['test:file']);
		expect(
			LITERAL_SCRIPTS.length + FILE_SCRIPTS.length,
		).toBe(ALLOWED_SCRIPTS.length);
	});

	it('stays in sync with the root package.json', () => {
		const report = validateAgainstPackageScripts(readRootPackageScripts());
		expect(report.missing).toEqual([]);
		expect(report.extra).toEqual([]);
	});

	it('reports drift when a script is unclassified', () => {
		const report = validateAgainstPackageScripts([
			...readRootPackageScripts(),
			'some:new:script',
		]);
		expect(report.extra).toEqual(['some:new:script']);
		expect(report.missing).toEqual([]);
	});

	it('marks the slow defect-replay validators as slow and long-budget', () => {
		for (const name of ['e2e:validate', 'pages:validate']) {
			const spec = getScriptSpec(name);
			expect(spec?.kind).toBe('e2e');
			expect(spec?.timeoutMs ?? 0).toBeGreaterThan(200_000);
		}
	});

	it('summarizes with one line per allowed script and the exclusions', () => {
		const text = summarizeScripts();
		for (const name of ALLOWED_SCRIPTS) {
			expect(text).toContain(`\`${name}\``);
		}
		expect(text).toContain('Excluded (do not run from a tool):');
		for (const name of EXCLUDED_SCRIPTS) {
			expect(text).toContain(`\`${name}\``);
		}
	});
});
