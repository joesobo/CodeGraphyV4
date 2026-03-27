import { execFileSync } from 'child_process';
import { resolvePackageToolGlobs } from '../config/qualityConfig';
import { type QualityTarget } from '../shared/resolveTarget';
import { REPO_ROOT } from '../shared/repoRoot';
import { buildMutateGlobs } from './mutateGlobs';
import { copySharedMutationReports, incrementalReportPath } from './reportArtifacts';
import { reportMutationSiteViolations } from './checkMutationSites';
import { resolveMutationProfile } from './mutationProfile';
import { sanitizeReportKey } from './reportKey';

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
  execFileSync('stryker', args, { cwd: REPO_ROOT, stdio: 'inherit' });
  const reportPath = copySharedMutationReports(reportKey, REPO_ROOT);
  reportMutationSiteViolations(reportPath);
}

export function buildMutationArgsForTest(target: QualityTarget): string[] {
  return buildArgs(target).args;
}
