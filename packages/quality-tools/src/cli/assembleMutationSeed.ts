#!/usr/bin/env tsx

import { writeMutationSeedReports } from '../mutation/seed/merge';
import { cleanCliArgs, flagValue } from '../shared/cliArgs';

function valueOrDefault(args: string[], name: string, fallback: string): string {
  return flagValue(args, name) ?? fallback;
}

try {
  const args = cleanCliArgs(process.argv.slice(2));
  const written = writeMutationSeedReports({
    inputRoot: valueOrDefault(args, '--input', 'package-seeds'),
    outputRoot: valueOrDefault(args, '--output', 'reports/mutation'),
    sha: valueOrDefault(args, '--sha', process.env.GITHUB_SHA ?? 'local'),
  });

  console.log(written.sort().join('\n'));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
