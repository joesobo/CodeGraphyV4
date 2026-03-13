#!/usr/bin/env tsx

import { execSync } from 'child_process';

const PLUGINS = [
	'plugin-typescript',
	'plugin-python',
	'plugin-csharp',
	'plugin-godot',
	'plugin-markdown',
];

function runOne(pkg: string): void {
	const reportDir = `reports/mutation/${pkg}`;

	const mutatePattern =
		pkg === 'extension'
			? 'packages/extension/src/**/*.ts,packages/extension/src/**/*.tsx,!packages/extension/src/**/*.d.ts,!packages/extension/src/e2e/**'
			: `packages/${pkg}/src/**/*.ts`;

	execSync(
		`stryker run` +
			` -m '${mutatePattern}'` +
			` --jsonReporter.fileName '${reportDir}/mutation.json'` +
			` --htmlReporter.fileName '${reportDir}/mutation.html'` +
			` --incrementalFile '${reportDir}/stryker-incremental.json'`,
		{ stdio: 'inherit' },
	);

	execSync(`tsx scripts/check-mutation-sites.ts ${reportDir}/mutation.json`, {
		stdio: 'inherit',
	});
}

const pkg = process.argv[2];

if (pkg) {
	runOne(pkg);
} else {
	for (const plugin of PLUGINS) {
		runOne(plugin);
	}
	runOne('extension');
}
