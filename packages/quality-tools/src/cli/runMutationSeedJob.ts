#!/usr/bin/env tsx

import { findMutationSeedJob } from '../mutation/seed/jobs';
import { runMutation } from '../mutation/runner/run';
import { cleanCliArgs, flagValue } from '../shared/cliArgs';
import { REPO_ROOT } from '../shared/resolve/repoRoot';
import { resolveQualityTarget } from '../shared/resolve/target';

function requiredFlag(args: string[], name: string): string {
  const value = flagValue(args, name);
  if (!value) {
    throw new Error(`Missing required ${name} value.`);
  }

  return value;
}

try {
  const args = cleanCliArgs(process.argv.slice(2));
  const packageName = requiredFlag(args, '--package');
  const shard = requiredFlag(args, '--shard');
  const job = findMutationSeedJob(REPO_ROOT, packageName, shard);
  const target = resolveQualityTarget(REPO_ROOT, `${job.package}/`);

  console.error(`[mutation] Running seed job ${job.package}/${job.shard}.`);
  await runMutation(target, {
    force: args.includes('--force'),
    mutateGlobs: job.mutate,
    testIncludes: job.testIncludes,
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
