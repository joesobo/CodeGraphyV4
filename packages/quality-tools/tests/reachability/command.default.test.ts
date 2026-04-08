import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import type { ReachabilityReport } from '../../src/reachability/types';

function createTarget() {
  return {
    absolutePath: `${REPO_ROOT}/packages/extension`,
    kind: 'package' as const,
    packageName: 'extension',
    packageRelativePath: '.',
    packageRoot: `${REPO_ROOT}/packages/extension`,
    relativePath: 'packages/extension',
  };
}

function createFailingReport(): ReachabilityReport {
  return {
    deadEnds: [
      {
        absolutePath: `${REPO_ROOT}/packages/extension/src/shared/isolated.ts`,
        entrypoint: false,
        incoming: 0,
        outgoing: 0,
        relativePath: 'packages/extension/src/shared/isolated.ts',
      },
    ],
    deadSurfaces: [],
    files: [
      {
        absolutePath: `${REPO_ROOT}/packages/extension/src/shared/isolated.ts`,
        entrypoint: false,
        incoming: 0,
        outgoing: 0,
        relativePath: 'packages/extension/src/shared/isolated.ts',
      },
    ],
    target: 'packages/extension',
  };
}

afterEach(() => {
  vi.resetModules();
  vi.restoreAllMocks();
  process.exitCode = undefined;
});

describe('runReachabilityCli default dependencies', () => {
  it('uses the built-in setExitCode implementation to set process.exitCode', async () => {
    const analyzeReachability = vi.fn(() => createFailingReport());
    const reportReachability = vi.fn();
    const resolveQualityTarget = vi.fn(() => createTarget());

    vi.doMock('../../src/reachability/analyze', () => ({ analyzeReachability }));
    vi.doMock('../../src/reachability/report', () => ({ reportReachability }));
    vi.doMock('../../src/shared/resolve/target', () => ({ resolveQualityTarget }));

    const { runReachabilityCli } = await import('../../src/reachability/command');

    runReachabilityCli(['extension/']);

    expect(process.exitCode).toBe(1);
    expect(reportReachability).toHaveBeenCalledWith(createFailingReport(), { verbose: false });
  });
});
