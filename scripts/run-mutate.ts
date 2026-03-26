#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, parse, resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = join(REPO_ROOT, 'packages');
const ROOT_REPORT_DIR = 'reports/mutation';
const BASE_MUTATE_EXCLUDES = ['!packages/**/src/**/*.d.ts', '!**/index.ts', '!**/index.tsx'];
const PACKAGE_SPECIFIC_MUTATE_EXCLUDES: Record<string, string[]> = {
	extension: [
		'!packages/extension/src/**/core/colors/colorPaletteTypes.ts',
		'!packages/extension/src/**/core/discovery/fileConstants.ts',
		'!packages/extension/src/**/core/plugins/versioning.ts',
		'!packages/extension/src/**/extension/configDefaults.ts',
		'!packages/extension/src/**/extension/gitHistory/constants.ts',
		'!packages/extension/src/**/shared/mockData*.ts',
		'!packages/extension/src/**/webview/components/icons/**',
		'!packages/extension/src/**/webview/components/settingsPanel/groups/options.ts',
		'!packages/extension/src/**/e2e/**',
		'!packages/extension/src/**/webview/export/types.ts',
		'!packages/extension/src/**/webview/storeDefaults.ts',
		'!packages/extension/src/**/webview/storeInitialState.ts',
		'!packages/extension/src/**/webview/storeMessageTypes.ts',
	],
};

interface MutationRunOptions {
	incrementalKey: string;
	mutatePattern?: string;
	reportDir: string;
}

function envFlag(name: string, cliOption: string, env: NodeJS.ProcessEnv): string {
	const value = env[name];
	return value ? ` ${cliOption} ${value}` : '';
}

function buildConcurrencyFlags(env: NodeJS.ProcessEnv = process.env): string {
	return (
		envFlag('MUTATION_CONCURRENCY', '--concurrency', env) +
		envFlag('MUTATION_MAX_TEST_RUNNERS', '--maxConcurrentTestRunners', env) +
		envFlag('MUTATION_DRY_RUN_TIMEOUT_MINUTES', '--dryRunTimeoutMinutes', env) +
		envFlag('MUTATION_MAX_TEST_RUNNER_REUSE', '--maxTestRunnerReuse', env)
	);
}

function sanitizeReportKey(value: string): string {
	return value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function hasDirectory(path: string): boolean {
	return existsSync(path);
}

function hasPackageSource(pkg: string): boolean {
	return hasDirectory(join(PACKAGES_DIR, pkg, 'src'));
}

function hasPackageTests(pkg: string): boolean {
	return hasDirectory(join(PACKAGES_DIR, pkg, 'tests')) || hasDirectory(join(PACKAGES_DIR, pkg, '__tests__'));
}

export function discoverMutationPackages(): string[] {
	const packageNames = readdirSync(PACKAGES_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.filter((pkg) => hasPackageSource(pkg) && hasPackageTests(pkg));

	return packageNames
		.filter((pkg) => pkg !== 'extension')
		.sort()
		.concat(packageNames.includes('extension') ? ['extension'] : []);
}

export function resolveMutationOptions(pkg: string, customPattern?: string): MutationRunOptions {
	if (!hasPackageSource(pkg)) {
		console.error(`Unknown mutation package: ${pkg}`);
		process.exit(1);
	}

	const isWholePackage = !customPattern;
	const label = isWholePackage ? pkg : sanitizeReportKey(customPattern).slice(0, 80) || 'custom';
	const useConfigMutateGlobs = pkg === 'extension' && isWholePackage;
	return {
		incrementalKey: isWholePackage ? pkg : `${pkg}-${label}`,
		mutatePattern: useConfigMutateGlobs
			? undefined
			:
			customPattern ??
			[
				`packages/${pkg}/src/**/*.ts`,
				`packages/${pkg}/src/**/*.tsx`,
				...BASE_MUTATE_EXCLUDES,
				...(PACKAGE_SPECIFIC_MUTATE_EXCLUDES[pkg] ?? []),
			].join(','),
		reportDir: isWholePackage ? `${ROOT_REPORT_DIR}/${pkg}` : `${ROOT_REPORT_DIR}/${pkg}/${label}`,
	};
}

export function buildStrykerCommand(
	options: MutationRunOptions,
	incrementalFile: string,
	env: NodeJS.ProcessEnv = process.env,
): string {
	const mutateFlag = options.mutatePattern ? ` -m '${options.mutatePattern}'` : '';
	return `stryker run${mutateFlag} --incrementalFile '${incrementalFile}'${buildConcurrencyFlags(env)}`;
}

function runOne(pkg: string, customPattern?: string): void {
	const options = resolveMutationOptions(pkg, customPattern);
	const { incrementalKey, reportDir } = options;
	const incrementalFile = `${reportDir}/stryker-incremental-${incrementalKey}.json`;
	execSync(buildStrykerCommand(options, incrementalFile), { stdio: 'inherit' });

	mkdirSync(reportDir, { recursive: true });

	// Stryker writes to shared report paths from the root config file.
	// Copy outputs to package-specific paths for easy per-package tracking.
	const sharedJson = `${ROOT_REPORT_DIR}/mutation.json`;
	const sharedHtml = `${ROOT_REPORT_DIR}/mutation.html`;

	if (existsSync(sharedJson)) {
		cpSync(sharedJson, `${reportDir}/mutation.json`);
	}
	if (existsSync(sharedHtml)) {
		cpSync(sharedHtml, `${reportDir}/mutation.html`);
	}

	execSync(`tsx scripts/check-mutation-sites.ts '${reportDir}/mutation.json'`, { stdio: 'inherit' });
}

export function main(args = process.argv.slice(2).filter((arg) => arg !== '--')): void {
	const pkg = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
	let customPattern: string | undefined;
	const optionStartIndex = pkg ? 1 : 0;

	for (let index = optionStartIndex; index < args.length; index++) {
		const arg = args[index];

		if (arg.startsWith('--mutate=')) {
			customPattern = arg.slice('--mutate='.length);
			continue;
		}

		if (arg === '--mutate') {
			customPattern = args[index + 1];
			index++;
			continue;
		}

		if (pkg === 'extension') {
			console.error(`Unexpected mutation argument: ${arg}\nExtension slices were removed. Use --mutate '<glob1,glob2>' for targeted extension runs.`);
			process.exit(1);
		}

		console.error(`Unexpected mutation argument: ${arg}`);
		process.exit(1);
	}

	if (args.includes('--mutate') && !customPattern) {
		console.error('Missing mutation glob after --mutate');
		process.exit(1);
	}

	if (customPattern && !pkg) {
		console.error('Custom mutation globs require a package argument.');
		process.exit(1);
	}

	if (pkg) {
		runOne(pkg, customPattern);
		return;
	}

	for (const discoveredPackage of discoverMutationPackages()) {
		runOne(discoveredPackage);
	}
}

export function shouldRunAsMain(argv1 = process.argv[1]): boolean {
	return argv1 ? parse(argv1).name === 'run-mutate' : false;
}

if (shouldRunAsMain()) {
	main();
}
