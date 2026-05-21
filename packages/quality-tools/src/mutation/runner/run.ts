import { spawn } from 'child_process';
import { resolvePackageToolGlobs } from '../../config/quality';
import { type QualityTarget } from '../../shared/resolve/target';
import { REPO_ROOT } from '../../shared/resolve/repoRoot';
import { buildMutateGlobs } from '../analysis/mutateGlobs';
import {
  copyIncrementalMutationReport,
  copySharedMutationReports,
  incrementalReportPath,
} from '../reporting/reportArtifacts';
import { reportMutationSiteViolations } from '../reporting/check';
import { resolveMutationProfile } from '../analysis/profile';
import { sanitizeReportKey } from '../../shared/util/reportKey';
import { resolveScopedVitestIncludes } from './vitestIncludes';
import { readReusableMutationReport } from './incrementalCache';

const MUTATION_PROGRESS_INTERVAL_MS = 60_000;

export interface MutationRunOptions {
  force?: boolean;
}

function formatElapsedDuration(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes === 0
    ? `${seconds}s`
    : `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

function buildArgs(target: QualityTarget, options: MutationRunOptions = {}): { args: string[]; reportKey: string } {
  const profile = resolveMutationProfile(target);
  const reportKey = target.kind === 'package'
    ? profile.packageName
    : sanitizeReportKey(target.relativePath);
  const args = ['run', profile.configPath, '--incrementalFile', incrementalReportPath(reportKey)];
  if (options.force) {
    args.push('--force');
  }
  const configPatterns = resolvePackageToolGlobs(REPO_ROOT, profile.packageName, 'mutation');
  args.push('-m', buildMutateGlobs(target, configPatterns).join(','));

  return { args, reportKey };
}

function runStryker(args: string[], env: NodeJS.ProcessEnv, target: QualityTarget): Promise<void> {
  const startedAt = Date.now();
  const child = spawn('stryker', args, { cwd: REPO_ROOT, env, stdio: 'inherit' });
  const progressTimer = setInterval(() => {
    console.error(
      `[mutation] Still running ${target.relativePath} after ${formatElapsedDuration(Date.now() - startedAt)}...`,
    );
  }, MUTATION_PROGRESS_INTERVAL_MS);

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      clearInterval(progressTimer);
      callback();
    };

    child.once('error', (error) => {
      settle(() => reject(error));
    });
    child.once('exit', (code, signal) => {
      settle(() => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`Stryker exited with ${signal ? `signal ${signal}` : `code ${code ?? 'unknown'}`}.`));
      });
    });
  });
}

function shouldForceMutation(options: MutationRunOptions): boolean {
  return options.force === true || process.env.CODEGRAPHY_MUTATE_FORCE === '1';
}

export async function runMutation(target: QualityTarget, options: MutationRunOptions = {}): Promise<void> {
  const forceMutation = shouldForceMutation(options);
  const { args, reportKey } = buildArgs(target, { force: forceMutation });
  const scopedVitestIncludes = resolveScopedVitestIncludes(target);
  const reportCache = forceMutation
    ? undefined
    : readReusableMutationReport(REPO_ROOT, target, incrementalReportPath(reportKey), scopedVitestIncludes ?? []);
  if (reportCache) {
    const reportPath = copyIncrementalMutationReport(reportKey, REPO_ROOT);
    console.log(
      `[mutation] Reusing unchanged incremental report for ${target.relativePath} (${reportCache.mutantCount} mutants, ${reportCache.mutationScore.toFixed(2)}% score).`,
    );
    reportMutationSiteViolations(reportPath);
    return;
  }

  const env = {
    ...process.env,
    CODEGRAPHY_MUTATION_RUN: '1',
    CODEGRAPHY_VITEST_SCOPE: target.packageName === 'extension'
      ? 'extension'
      : process.env.CODEGRAPHY_VITEST_SCOPE ?? 'workspace',
    ...(scopedVitestIncludes
      ? {
          CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify(scopedVitestIncludes),
        }
      : {}),
  };
  await runStryker(args, env, target);
  const reportPath = copySharedMutationReports(reportKey, REPO_ROOT);
  reportMutationSiteViolations(reportPath);
}

export function buildMutationArgsForTest(target: QualityTarget): string[] {
  return buildArgs(target).args;
}
