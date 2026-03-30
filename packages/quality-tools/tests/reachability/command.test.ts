import { describe, expect, it, vi } from 'vitest';
import type { BoundaryFileNode } from '../../src/boundaries/types';
import { runReachabilityCli, type ReachabilityCliDependencies } from '../../src/reachability/command';
import type { ReachabilityReport } from '../../src/reachability/types';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import type { QualityTarget } from '../../src/shared/resolve/target';

function createTarget(): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/extension`,
    kind: 'package',
    packageName: 'extension',
    packageRelativePath: '.',
    packageRoot: `${REPO_ROOT}/packages/extension`,
    relativePath: 'packages/extension'
  };
}

function createFile(relativePath: string, incoming: number, outgoing: number): BoundaryFileNode {
  return {
    absolutePath: `${REPO_ROOT}/${relativePath}`,
    entrypoint: false,
    incoming,
    outgoing,
    relativePath
  };
}

function createReport(): ReachabilityReport {
  return {
    deadEnds: [],
    deadSurfaces: [],
    files: [],
    target: 'packages/extension'
  };
}

function createDependencies(report: ReachabilityReport = createReport()): ReachabilityCliDependencies {
  return {
    analyzeReachability: vi.fn(() => report),
    reportReachability: vi.fn(),
    resolveQualityTarget: vi.fn(() => createTarget()),
    setExitCode: vi.fn()
  };
}

describe('runReachabilityCli', () => {
  it('passes the resolved target into the analyzer and reports the summary', () => {
    const dependencies = createDependencies();

    runReachabilityCli(['extension/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'extension/');
    expect(dependencies.analyzeReachability).toHaveBeenCalledWith(REPO_ROOT, createTarget());
    expect(dependencies.reportReachability).toHaveBeenCalledWith(createReport(), { verbose: false });
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
  });

  it('sets a failure exit code for dead ends', () => {
    const dependencies = createDependencies({
      ...createReport(),
      deadEnds: [createFile('packages/extension/src/shared/isolated.ts', 0, 0)]
    });

    runReachabilityCli(['extension/'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
  });

  it('prints JSON and fails in strict mode for dead surfaces', () => {
    const dependencies = createDependencies({
      ...createReport(),
      deadSurfaces: [createFile('packages/extension/src/shared/orphan.ts', 0, 1)]
    });
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runReachabilityCli(['--json', '--strict', 'extension/'], dependencies);

    expect(log).toHaveBeenCalledTimes(1);
    expect(dependencies.reportReachability).not.toHaveBeenCalled();
    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);

    log.mockRestore();
  });
});
