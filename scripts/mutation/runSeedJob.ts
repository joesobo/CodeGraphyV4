#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { findMutationSeedJob } from './seedJobs';
import { REPO_ROOT } from './paths';

function flagValue(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function requiredFlag(args: readonly string[], flag: string): string {
  const value = flagValue(args, flag);
  if (!value) {
    throw new Error(`Missing required ${flag} value.`);
  }

  return value;
}

function runQualityToolsMutation(args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn('pnpm', ['exec', 'quality-tools', 'mutate', ...args], {
      cwd: REPO_ROOT,
      env,
      stdio: 'inherit',
    });

    child.once('error', rejectRun);
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }

      rejectRun(new Error(`quality-tools mutate exited with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}.`));
    });
  });
}

try {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const packageName = requiredFlag(args, '--package');
  const shard = requiredFlag(args, '--shard');
  const job = findMutationSeedJob(REPO_ROOT, packageName, shard);

  console.error(`[mutation] Running seed job ${job.package}/${job.shard}.`);
  await runQualityToolsMutation([
    `${job.package}/`,
    '--mutate-globs-json',
    JSON.stringify(job.mutate),
    ...(args.includes('--force') ? ['--force'] : []),
  ], {
    ...process.env,
    CODEGRAPHY_MUTATION_RUN: '1',
    CODEGRAPHY_VITEST_SCOPE: job.package === 'extension'
      ? 'extension'
      : process.env.CODEGRAPHY_VITEST_SCOPE ?? 'workspace',
    CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify(job.testIncludes),
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
