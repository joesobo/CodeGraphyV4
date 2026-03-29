import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QualityTarget } from '../../../src/shared/resolve/target';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';

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
const resolveScopedVitestIncludes = vi.fn<(target: QualityTarget) => string[] | undefined>(() => undefined);

vi.mock('child_process', () => ({
  execFileSync
}));

vi.mock('../../../src/mutation/reporting/reportArtifacts', () => ({
  copySharedMutationReports,
  incrementalReportPath: vi.fn((reportKey: string) => `reports/mutation/${reportKey}/stryker-incremental-${reportKey}.json`)
}));

vi.mock('../../../src/mutation/reporting/check', () => ({
  reportMutationSiteViolations
}));

vi.mock('../../../src/config/quality', () => ({
  resolvePackageToolGlobs
}));

vi.mock('../../../src/mutation/analysis/mutateGlobs', () => ({
  buildMutateGlobs
}));

vi.mock('../../../src/mutation/analysis/profile', () => ({
  resolveMutationProfile
}));

vi.mock('../../../src/mutation/runner/vitestIncludes', () => ({
  resolveScopedVitestIncludes
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

function fileTarget(): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/quality-tools/src/mutation/runner/run.ts`,
    kind: 'file',
    packageName: 'quality-tools',
    packageRelativePath: 'src/mutation/runner/run.ts',
    packageRoot: `${REPO_ROOT}/packages/quality-tools`,
    relativePath: 'packages/quality-tools/src/mutation/runner/run.ts'
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
    resolveScopedVitestIncludes.mockReset();
    resolveScopedVitestIncludes.mockReturnValue(undefined);
  });

  it('runs stryker and reports site violations for the copied report', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');

    runMutation(target());

    expect(resolvePackageToolGlobs).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools', 'mutation');
    expect(buildMutateGlobs).toHaveBeenCalledWith(target(), {
      include: ['packages/quality-tools/src/**/*.ts'],
      exclude: ['packages/quality-tools/src/cli/**/*.ts']
    });
    expect(execFileSync).toHaveBeenCalledWith(
      'stryker',
      [
        'run',
        'packages/quality-tools/stryker.config.json',
        '--incrementalFile',
        'reports/mutation/quality-tools/stryker-incremental-quality-tools.json',
        '-m',
        'packages/quality-tools/src/**/*.ts,!packages/quality-tools/src/cli/**/*.ts',
      ],
      expect.objectContaining({
        cwd: REPO_ROOT,
        env: process.env,
        stdio: 'inherit',
      }),
    );
    expect(copySharedMutationReports).toHaveBeenCalledWith('quality-tools', REPO_ROOT);
    expect(reportMutationSiteViolations).toHaveBeenCalledWith('/repo/reports/mutation.json');
  });

  it('passes scoped vitest includes for file targets', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');
    resolveScopedVitestIncludes.mockReturnValue([
      'packages/quality-tools/tests/mutation/runner/run.test.ts',
      'packages/quality-tools/__tests__/mutation/runner/run.test.tsx',
    ]);

    runMutation(fileTarget());

    const options = execFileSync.mock.calls[0][2] as { env: Record<string, string> };
    const includes = JSON.parse(options.env.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[];

    expect(includes).toContain('packages/quality-tools/tests/mutation/runner/run.test.ts');
    expect(includes).toContain('packages/quality-tools/__tests__/mutation/runner/run.test.tsx');
  });

  it('passes scoped vitest includes for directory targets', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');
    resolveScopedVitestIncludes.mockReturnValue([
      'packages/quality-tools/tests/mutation/**/*.test.ts',
      'packages/quality-tools/__tests__/mutation/**/*.test.tsx',
    ]);

    runMutation({
      absolutePath: `${REPO_ROOT}/packages/quality-tools/src/mutation`,
      kind: 'directory',
      packageName: 'quality-tools',
      packageRelativePath: 'src/mutation',
      packageRoot: `${REPO_ROOT}/packages/quality-tools`,
      relativePath: 'packages/quality-tools/src/mutation',
    });

    const options = execFileSync.mock.calls[0][2] as { env: Record<string, string> };
    const includes = JSON.parse(options.env.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[];

    expect(includes).toContain('packages/quality-tools/tests/mutation/**/*.test.ts');
    expect(includes).toContain('packages/quality-tools/__tests__/mutation/**/*.test.tsx');

    expect(execFileSync).toHaveBeenCalledWith(
      'stryker',
      expect.any(Array),
      expect.objectContaining({
        cwd: REPO_ROOT,
        env: expect.objectContaining({
          CODEGRAPHY_VITEST_INCLUDE_JSON: expect.any(String),
        }),
        stdio: 'inherit',
      }),
    );
  });
});
