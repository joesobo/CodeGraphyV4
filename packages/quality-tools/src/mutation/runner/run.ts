import { execFileSync } from 'child_process';
import { resolvePackageToolGlobs } from '../../config/quality';
import { type QualityTarget } from '../../shared/resolve/target';
import { REPO_ROOT } from '../../shared/resolve/repoRoot';
import { buildMutateGlobs } from '../analysis/mutateGlobs';
import { copySharedMutationReports, incrementalReportPath } from '../reporting/reportArtifacts';
import { reportMutationSiteViolations } from '../reporting/check';
import { resolveMutationProfile } from '../analysis/profile';
import { sanitizeReportKey } from '../../shared/util/reportKey';
import { resolveScopedVitestIncludes } from './vitestIncludes';

function buildArgs(target: QualityTarget): { args: string[]; reportKey: string } {
  const profile = resolveMutationProfile(target);
  const reportKey = target.kind === 'package'
    ? profile.packageName
    : sanitizeReportKey(target.relativePath);
  const args = ['run', profile.configPath, '--incrementalFile', incrementalReportPath(reportKey)];
  const configPatterns = resolvePackageToolGlobs(REPO_ROOT, profile.packageName, 'mutation');
  args.push('-m', buildMutateGlobs(target, configPatterns).join(','));

  return { args, reportKey };
}

export function runMutation(target: QualityTarget): void {
  const { args, reportKey } = buildArgs(target);
  const scopedVitestIncludes = resolveScopedVitestIncludes(target);
  const env = {
    ...process.env,
    CODEGRAPHY_VITEST_SCOPE: target.packageName === 'extension'
      ? 'extension'
      : process.env.CODEGRAPHY_VITEST_SCOPE ?? 'workspace',
    ...(scopedVitestIncludes
      ? {
          CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify(scopedVitestIncludes),
        }
      : {}),
  };
  execFileSync('stryker', args, { cwd: REPO_ROOT, env, stdio: 'inherit' });
  const reportPath = copySharedMutationReports(reportKey, REPO_ROOT);
  reportMutationSiteViolations(reportPath);
}

export function buildMutationArgsForTest(target: QualityTarget): string[] {
  return buildArgs(target).args;
}
