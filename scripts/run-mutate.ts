#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync } from 'fs';

const PLUGINS = [
	'plugin-typescript',
	'plugin-python',
	'plugin-csharp',
	'plugin-godot',
	'plugin-markdown',
];

const ROOT_REPORT_DIR = 'reports/mutation';
const DEFAULT_EXTENSION_PATTERN =
	'packages/extension/src/**/*.ts,packages/extension/src/**/*.tsx,!packages/extension/src/**/*.d.ts,!packages/extension/src/e2e/**';

const EXTENSION_SLICES: Record<string, string> = {
	'graph-view-provider':
		'packages/extension/src/extension/GraphViewProvider.ts,packages/extension/src/extension/graphView/**/*.ts',
	'graph-view-messages': 'packages/extension/src/extension/graphView/messages/**/*.ts',
	'workspace-analysis':
		'packages/extension/src/extension/WorkspaceAnalyzer.ts,packages/extension/src/extension/workspace*.ts,packages/extension/src/extension/workspaceAnalyzer/**/*.ts',
	'graph-webview':
		'packages/extension/src/webview/components/Graph.tsx,packages/extension/src/webview/components/graph*.ts,packages/extension/src/webview/components/graph/**/*.ts',
	'graph-effects': 'packages/extension/src/webview/components/graph/effects/**/*.ts',
	'settings-panel':
		'packages/extension/src/webview/components/settingsPanel/**/*.ts,packages/extension/src/webview/components/settingsPanel/**/*.tsx',
	'timeline':
		'packages/extension/src/webview/components/Timeline.tsx,packages/extension/src/webview/components/timeline/**/*.ts,packages/extension/src/webview/components/timeline/**/*.tsx',
	'webview-export': 'packages/extension/src/webview/lib/export/**/*.ts',
	'git-history': 'packages/extension/src/extension/GitHistoryAnalyzer.ts',
};

interface MutationRunOptions {
	incrementalKey: string;
	mutatePattern: string;
	reportDir: string;
}

function envFlag(name: string, cliOption: string): string {
	const value = process.env[name];
	return value ? ` ${cliOption} ${value}` : '';
}

function sanitizeReportKey(value: string): string {
	return value.replace(/[^a-z0-9.-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

function printExtensionSlices(): void {
	console.log('\nAvailable extension mutation slices:\n');
	for (const slice of Object.keys(EXTENSION_SLICES).sort()) {
		console.log(`  - ${slice}`);
	}
	console.log('');
}

function resolveExtensionOptions(slice?: string, customPattern?: string): MutationRunOptions {
	const label = sanitizeReportKey(slice ?? (customPattern ? 'custom' : 'extension'));
	const mutatePattern = customPattern ?? (slice ? EXTENSION_SLICES[slice] : DEFAULT_EXTENSION_PATTERN);

	if (!mutatePattern) {
		console.error(`Unknown extension mutation slice: ${slice}`);
		printExtensionSlices();
		process.exit(1);
	}

	const isWholeExtension = !slice && !customPattern;
	return {
		incrementalKey: isWholeExtension ? 'extension' : `extension-${label}`,
		mutatePattern,
		reportDir: isWholeExtension ? `${ROOT_REPORT_DIR}/extension` : `${ROOT_REPORT_DIR}/extension/${label}`,
	};
}

function resolveMutationOptions(pkg: string, slice?: string, customPattern?: string): MutationRunOptions {
	if (pkg === 'extension') {
		return resolveExtensionOptions(slice, customPattern);
	}

	if (slice || customPattern) {
		console.error(`Mutation slices are only supported for the extension package. Received: ${pkg}`);
		process.exit(1);
	}

	return {
		incrementalKey: pkg,
		mutatePattern: `packages/${pkg}/src/**/*.ts`,
		reportDir: `${ROOT_REPORT_DIR}/${pkg}`,
	};
}

function runOne(pkg: string, slice?: string, customPattern?: string): void {
	const { incrementalKey, mutatePattern, reportDir } = resolveMutationOptions(pkg, slice, customPattern);
	const incrementalFile = `${reportDir}/stryker-incremental-${incrementalKey}.json`;
	const concurrencyFlags =
		envFlag('MUTATION_CONCURRENCY', '--concurrency') +
		envFlag('MUTATION_MAX_TEST_RUNNERS', '--maxConcurrentTestRunners') +
		envFlag('MUTATION_DRY_RUN_TIMEOUT_MINUTES', '--dryRunTimeoutMinutes') +
		envFlag('MUTATION_MAX_TEST_RUNNER_REUSE', '--maxTestRunnerReuse');

	execSync(
		`stryker run` +
			` -m '${mutatePattern}'` +
			` --incrementalFile '${incrementalFile}'` +
			concurrencyFlags,
		{ stdio: 'inherit' },
	);

	mkdirSync(reportDir, { recursive: true });

	// Stryker writes to shared report paths from stryker.config.json.
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

const args = process.argv.slice(2).filter((arg) => arg !== '--');
const pkg = args[0] && !args[0].startsWith('--') ? args[0] : undefined;
let slice: string | undefined;
let customPattern: string | undefined;
let listSlices = false;
const optionStartIndex = pkg ? 1 : 0;

for (let index = optionStartIndex; index < args.length; index++) {
	const arg = args[index];

	if (arg === '--list-slices') {
		listSlices = true;
		continue;
	}

	if (arg.startsWith('--mutate=')) {
		customPattern = arg.slice('--mutate='.length);
		continue;
	}

	if (arg === '--mutate') {
		customPattern = args[index + 1];
		index++;
		continue;
	}

	if (!slice) {
		slice = arg;
		continue;
	}

	console.error(`Unexpected mutation argument: ${arg}`);
	process.exit(1);
}

if (args.includes('--mutate') && !customPattern) {
	console.error('Missing mutation glob after --mutate');
	process.exit(1);
}

if (listSlices) {
	printExtensionSlices();
	process.exit(0);
}

if (pkg) {
	runOne(pkg, slice, customPattern);
} else {
	for (const plugin of PLUGINS) {
		runOne(plugin);
	}
	runOne('extension');
}
