#!/usr/bin/env tsx

/**
 * Checks mutation site counts per file from a Stryker JSON report.
 * Warns when any file exceeds the threshold, suggesting it should be split.
 *
 * Usage: tsx scripts/check-mutation-sites.ts <path-to-mutation.json> [--threshold N]
 */

import { readFileSync, existsSync } from 'fs';

interface Mutant {
	id: string;
	status: string;
}

interface FileReport {
	mutants: Mutant[];
}

interface MutationReport {
	files: Record<string, FileReport>;
}

const DEFAULT_THRESHOLD = 50;

function main(): void {
	const args = process.argv.slice(2);
	const reportPath = args.find((arg) => !arg.startsWith('--'));
	const thresholdArg = args.find((arg) => arg.startsWith('--threshold'));
	const threshold = thresholdArg
		? parseInt(thresholdArg.split('=')[1] || args[args.indexOf(thresholdArg) + 1], 10)
		: DEFAULT_THRESHOLD;

	if (!reportPath) {
		console.error('Usage: tsx scripts/check-mutation-sites.ts <path-to-mutation.json> [--threshold N]');
		process.exit(1);
	}

	if (!existsSync(reportPath)) {
		console.error(`Report not found: ${reportPath}`);
		console.error('Run mutation testing first to generate the report.');
		process.exit(1);
	}

	const report = JSON.parse(readFileSync(reportPath, 'utf-8')) as MutationReport;
	const files = report.files ?? {};

	const violations: { file: string; count: number }[] = [];

	for (const [filePath, fileData] of Object.entries(files)) {
		const mutantCount = (fileData.mutants ?? []).length;
		if (mutantCount > threshold) {
			violations.push({ file: filePath, count: mutantCount });
		}
	}

	if (violations.length === 0) {
		console.log(`\n✅ All files are within the mutation site threshold (${threshold}).\n`);
		return;
	}

	violations.sort((left, right) => right.count - left.count);

	console.log(`\n⚠️  MUTATION SITE THRESHOLD EXCEEDED (max: ${threshold})`);
	console.log('━'.repeat(60));
	console.log('The following files have too many mutation sites, indicating');
	console.log('high complexity. Consider splitting them into smaller modules.\n');

	for (const { file, count } of violations) {
		console.log(`  ${count} mutation sites  →  ${file}`);
	}

	console.log(`\n${'━'.repeat(60)}`);
	console.log(`${violations.length} file(s) exceed the threshold of ${threshold} mutation sites.\n`);
}

main();
