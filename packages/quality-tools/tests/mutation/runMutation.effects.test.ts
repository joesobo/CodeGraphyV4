import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QualityTarget } from '../../src/shared/resolveTarget';
import { REPO_ROOT } from '../../src/shared/repoRoot';

const execFileSync = vi.fn();
const copySharedMutationReports = vi.fn(() => '/repo/reports/mutation.json');
const reportMutationSiteViolations = vi.fn();
const resolvePackageToolGlobs = vi.fn(() => ({
  include: ['packages/quality-tools/src/**/*.ts'],
  exclude: ['packages/quality-tools/src/cli/**/*.ts']
}));
const buildMutateGlobs = vi.fn(() => [
  'packages/quality-tools/src/**/*.ts',
  '!packages/quality-tools/src/cli/**/*.ts'
]);
const resolveMutationProfile = vi.fn(() => ({
  configPath: 'packages/quality-tools/stryker.config.json',
  packageName: 'quality-tools'
}));

vi.mock('child_process', () => ({
  execFileSync
}));

vi.mock('../../src/mutation/reportArtifacts', () => ({
  copySharedMutationReports,
  incrementalReportPath: vi.fn((reportKey: string) => `reports/mutation/${reportKey}/stryker-incremental-${reportKey}.json`)
}));

vi.mock('../../src/mutation/checkMutationSites', () => ({
  reportMutationSiteViolations
}));

vi.mock('../../src/config/qualityConfig', () => ({
  resolvePackageToolGlobs
}));

vi.mock('../../src/mutation/mutateGlobs', () => ({
  buildMutateGlobs
}));

vi.mock('../../src/mutation/mutationProfile', () => ({
  resolveMutationProfile
}));

function target(): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/quality-tools`,
    kind: 'package',
    packageName: 'quality-tools',
    packageRelativePath: '.',
    packageRoot: `${REPO_ROOT}/packages/quality-tools`,
    relativePath: 'packages/quality-tools'
  };
}

describe('runMutation', () => {
  beforeEach(() => {
    execFileSync.mockClear();
    copySharedMutationReports.mockClear();
    reportMutationSiteViolations.mockClear();
    resolvePackageToolGlobs.mockClear();
    buildMutateGlobs.mockClear();
    resolveMutationProfile.mockClear();
  });

  it('runs stryker and reports site violations for the copied report', async () => {
    const { runMutation } = await import('../../src/mutation/runMutation');

    runMutation(target());

    expect(resolvePackageToolGlobs).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools', 'mutation');
    expect(buildMutateGlobs).toHaveBeenCalledWith(target(), {
      include: ['packages/quality-tools/src/**/*.ts'],
      exclude: ['packages/quality-tools/src/cli/**/*.ts']
    });
    expect(execFileSync).toHaveBeenCalledWith('stryker', [
      'run',
      'packages/quality-tools/stryker.config.json',
      '--incrementalFile',
      'reports/mutation/quality-tools/stryker-incremental-quality-tools.json',
      '-m',
      'packages/quality-tools/src/**/*.ts,!packages/quality-tools/src/cli/**/*.ts'
    ], {
      cwd: REPO_ROOT,
      stdio: 'inherit'
    });
    expect(copySharedMutationReports).toHaveBeenCalledWith('quality-tools', REPO_ROOT);
    expect(reportMutationSiteViolations).toHaveBeenCalledWith('/repo/reports/mutation.json');
  });
});
