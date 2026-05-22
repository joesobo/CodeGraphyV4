import { EventEmitter } from 'node:events';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { QualityTarget } from '../../../src/shared/resolve/target';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';

const spawn = vi.fn((_command: string, _args: string[], _options: SpawnOptions): ChildProcess => {
  const child = new EventEmitter();
  queueMicrotask(() => {
    child.emit('exit', 0, null);
  });
  return child as ChildProcess;
});
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

vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();

  return {
    ...actual,
    default: {
      ...actual,
      spawn,
    },
    spawn,
  };
});

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
    spawn.mockClear();
    copySharedMutationReports.mockClear();
    reportMutationSiteViolations.mockClear();
    resolvePackageToolGlobs.mockClear();
    buildMutateGlobs.mockClear();
    resolveMutationProfile.mockClear();
    resolveScopedVitestIncludes.mockReset();
    resolveScopedVitestIncludes.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('runs stryker and reports site violations for the copied report', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');
    resolveScopedVitestIncludes.mockReturnValue([
      'packages/quality-tools/tests/**/*.test.ts',
      'packages/quality-tools/tests/**/*.test.tsx',
      'packages/quality-tools/tests/**/*.test.ts',
      'packages/quality-tools/tests/**/*.test.tsx',
    ]);

    await runMutation(target());

    expect(resolvePackageToolGlobs).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools', 'mutation');
    expect(buildMutateGlobs).toHaveBeenCalledWith(target(), {
      include: ['packages/quality-tools/src/**/*.ts'],
      exclude: ['packages/quality-tools/src/cli/**/*.ts']
    });
    expect(spawn).toHaveBeenCalledWith(
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
        env: expect.objectContaining({
          ...process.env,
          CODEGRAPHY_MUTATION_RUN: '1',
          CODEGRAPHY_VITEST_INCLUDE_JSON: expect.any(String),
        }),
        stdio: 'inherit',
      }),
    );
    expect(
      JSON.parse((spawn.mock.calls[0][2] as { env: Record<string, string> }).env.CODEGRAPHY_VITEST_INCLUDE_JSON)
    ).toEqual([
      'packages/quality-tools/tests/**/*.test.ts',
      'packages/quality-tools/tests/**/*.test.tsx',
      'packages/quality-tools/tests/**/*.test.ts',
      'packages/quality-tools/tests/**/*.test.tsx',
    ]);
    expect(copySharedMutationReports).toHaveBeenCalledWith('quality-tools', REPO_ROOT);
    expect(reportMutationSiteViolations).toHaveBeenCalledWith('/repo/reports/mutation.json');
  });

  it('passes scoped vitest includes for file targets', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');
    resolveScopedVitestIncludes.mockReturnValue([
      'packages/quality-tools/tests/mutation/runner/run.test.ts',
      'packages/quality-tools/tests/mutation/runner/run.test.tsx',
    ]);

    await runMutation(fileTarget());

    const options = spawn.mock.calls[0][2] as { env: Record<string, string> };
    const includes = JSON.parse(options.env.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[];

    expect(includes).toContain('packages/quality-tools/tests/mutation/runner/run.test.ts');
    expect(includes).toContain('packages/quality-tools/tests/mutation/runner/run.test.tsx');
  });

  it('keeps an explicit Stryker concurrency override for file targets', async () => {
    process.env.CODEGRAPHY_STRYKER_CONCURRENCY = '3';
    const { runMutation } = await import('../../../src/mutation/runner/run');

    try {
      await runMutation(fileTarget());

      const options = spawn.mock.calls[0][2] as { env: Record<string, string> };
      expect(options.env.CODEGRAPHY_STRYKER_CONCURRENCY).toBe('3');
    } finally {
      delete process.env.CODEGRAPHY_STRYKER_CONCURRENCY;
    }
  });

  it('passes force reruns through to Stryker incremental mode', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');

    await runMutation(fileTarget(), { force: true });

    expect(spawn).toHaveBeenCalledWith(
      'stryker',
      expect.arrayContaining(['--force']),
      expect.any(Object),
    );
  });

  it('passes scoped vitest includes for directory targets', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');
    resolveScopedVitestIncludes.mockReturnValue([
      'packages/quality-tools/tests/mutation/**/*.test.ts',
      'packages/quality-tools/tests/mutation/**/*.test.tsx',
    ]);

    await runMutation({
      absolutePath: `${REPO_ROOT}/packages/quality-tools/src/mutation`,
      kind: 'directory',
      packageName: 'quality-tools',
      packageRelativePath: 'src/mutation',
      packageRoot: `${REPO_ROOT}/packages/quality-tools`,
      relativePath: 'packages/quality-tools/src/mutation',
    });

    const options = spawn.mock.calls[0][2] as { env: Record<string, string> };
    const includes = JSON.parse(options.env.CODEGRAPHY_VITEST_INCLUDE_JSON) as string[];

    expect(includes).toContain('packages/quality-tools/tests/mutation/**/*.test.ts');
    expect(includes).toContain('packages/quality-tools/tests/mutation/**/*.test.tsx');

    expect(spawn).toHaveBeenCalledWith(
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

  it('uses explicit mutate globs and test includes for seed shards', async () => {
    const { runMutation } = await import('../../../src/mutation/runner/run');

    await runMutation(target(), {
      mutateGlobs: ['packages/quality-tools/src/mutation/**/*.ts'],
      testIncludes: ['packages/quality-tools/tests/mutation/**/*.test.ts'],
    });

    expect(buildMutateGlobs).not.toHaveBeenCalled();
    expect(spawn).toHaveBeenCalledWith(
      'stryker',
      expect.arrayContaining([
        '-m',
        'packages/quality-tools/src/mutation/**/*.ts,!packages/quality-tools/src/cli/**/*.ts',
      ]),
      expect.objectContaining({
        env: expect.objectContaining({
          CODEGRAPHY_VITEST_INCLUDE_JSON: JSON.stringify([
            'packages/quality-tools/tests/mutation/**/*.test.ts',
          ]),
        }),
      }),
    );
  });

  it('prints a heartbeat while stryker is still running', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const child = new EventEmitter();
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    spawn.mockReturnValueOnce(child as ChildProcess);
    const { runMutation } = await import('../../../src/mutation/runner/run');

    const run = runMutation(target());
    await vi.advanceTimersByTimeAsync(60_000);
    child.emit('exit', 0, null);
    await run;

    expect(log).toHaveBeenCalledWith(
      '[mutation] Still running packages/quality-tools after 1m 00s...',
    );
  });
});
