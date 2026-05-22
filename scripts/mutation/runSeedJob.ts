#!/usr/bin/env tsx

import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findMutationSeedJob, type MutationSeedJob } from './seedJobs';
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

export function buildQualityToolsMutationArgs(
  job: MutationSeedJob,
  options: { force?: boolean } = {},
): string[] {
  return [
    `${job.package}/`,
    '--mutate-globs-json',
    JSON.stringify(job.mutate),
    '--test-includes-json',
    JSON.stringify(job.testIncludes),
    ...(options.force ? ['--force'] : []),
  ];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  const packageName = requiredFlag(args, '--package');
  const shard = requiredFlag(args, '--shard');
  const job = findMutationSeedJob(REPO_ROOT, packageName, shard);

  console.error(`[mutation] Running seed job ${job.package}/${job.shard}.`);
  await runQualityToolsMutation(buildQualityToolsMutationArgs(job, {
    force: args.includes('--force'),
  }), {
    ...process.env,
    CODEGRAPHY_MUTATION_RUN: '1',
    CODEGRAPHY_VITEST_SCOPE: job.package === 'extension'
      ? 'extension'
      : process.env.CODEGRAPHY_VITEST_SCOPE ?? 'workspace',
    CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify(job.testIncludes),
  });
}

function isEntrypoint(): boolean {
  return Boolean(process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));
}

if (isEntrypoint()) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
