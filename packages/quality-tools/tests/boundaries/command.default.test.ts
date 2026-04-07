import { afterEach, describe, expect, it, vi } from 'vitest';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import type { BoundaryReport } from '../../src/boundaries/types';

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

function createFailingReport(): BoundaryReport {
  return {
    deadEnds: [],
    deadSurfaces: [],
    files: [
      {
        absolutePath: `${REPO_ROOT}/packages/extension/src/core/index.ts`,
        entrypoint: true,
        incoming: 1,
        outgoing: 1,
        relativePath: 'packages/extension/src/core/index.ts',
      },
    ],
    layerViolations: [
      {
        from: 'packages/extension/src/core/bad.ts',
        reason: 'core cannot depend on webview',
        to: 'packages/extension/src/webview/view.ts',
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

describe('runBoundariesCli default dependencies', () => {
  it('uses the built-in setExitCode implementation to set process.exitCode', async () => {
    const analyzeBoundaries = vi.fn(() => createFailingReport());
    const reportBoundaries = vi.fn();
    const resolveQualityTarget = vi.fn(() => createTarget());

    vi.doMock('../../src/boundaries/analyze', () => ({ analyzeBoundaries }));
    vi.doMock('../../src/boundaries/report', () => ({ reportBoundaries }));
    vi.doMock('../../src/shared/resolve/target', () => ({ resolveQualityTarget }));

    const { runBoundariesCli } = await import('../../src/boundaries/command');

    runBoundariesCli(['extension/']);

    expect(process.exitCode).toBe(1);
    expect(reportBoundaries).toHaveBeenCalledWith(createFailingReport(), { verbose: false });
  });
});
