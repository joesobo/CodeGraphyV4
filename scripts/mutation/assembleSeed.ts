#!/usr/bin/env tsx

import { writeMutationSeedReports } from './seedMerge';

function flagValue(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function valueOrDefault(args: readonly string[], flag: string, fallback: string): string {
  return flagValue(args, flag) ?? fallback;
}

try {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const written = writeMutationSeedReports({
    inputRoot: valueOrDefault(args, '--input', 'package-seeds'),
    outputRoot: valueOrDefault(args, '--output', 'reports/quality-tools/mutation'),
    sha: valueOrDefault(args, '--sha', process.env.GITHUB_SHA ?? 'local'),
  });

  console.log(written.sort().join('\n'));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
