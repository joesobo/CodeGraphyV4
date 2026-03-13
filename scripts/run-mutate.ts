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

function runOne(pkg: string): void {
	const reportDir = `${ROOT_REPORT_DIR}/${pkg}`;
	const incrementalFile = `${reportDir}/stryker-incremental-${pkg}.json`;

	const mutatePattern =
		pkg === 'extension'
			? 'packages/extension/src/**/*.ts,packages/extension/src/**/*.tsx,!packages/extension/src/**/*.d.ts,!packages/extension/src/e2e/**'
			: `packages/${pkg}/src/**/*.ts`;

	execSync(
		`stryker run` +
			` -m '${mutatePattern}'` +
			` --incrementalFile '${incrementalFile}'`,
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

const pkg = process.argv
	.slice(2)
	.find((arg) => arg !== '--' && !arg.startsWith('-'));

if (pkg) {
	runOne(pkg);
} else {
	for (const plugin of PLUGINS) {
		runOne(plugin);
	}
	runOne('extension');
}
