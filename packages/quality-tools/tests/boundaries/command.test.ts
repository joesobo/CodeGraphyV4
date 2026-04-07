import { describe, expect, it, vi } from 'vitest';
import { runBoundariesCli, type BoundariesCliDependencies } from '../../src/boundaries/command';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import type { BoundaryReport } from '../../src/boundaries/types';
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

function createReport(): BoundaryReport {
  return {
    deadEnds: [],
    deadSurfaces: [],
    files: [],
    layerViolations: [],
    target: 'packages/extension'
  };
}

function createDependencies(report: BoundaryReport = createReport()): BoundariesCliDependencies {
  return {
    analyzeBoundaries: vi.fn(() => report),
    reportBoundaries: vi.fn(),
    resolveQualityTarget: vi.fn(() => createTarget()),
    setExitCode: vi.fn()
  };
}

describe('runBoundariesCli', () => {
  it('passes the resolved target into the analyzer and reports the summary', () => {
    const dependencies = createDependencies();

    runBoundariesCli(['extension/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'extension/');
    expect(dependencies.analyzeBoundaries).toHaveBeenCalledWith(REPO_ROOT, createTarget());
    expect(dependencies.reportBoundaries).toHaveBeenCalledWith(createReport(), { verbose: false });
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
  });

  it('treats a leading --verbose flag as a value flag during target parsing and still reports verbose output', () => {
    const dependencies = createDependencies();

    runBoundariesCli(['--verbose', 'extension/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, undefined);
    expect(dependencies.reportBoundaries).toHaveBeenCalledWith(createReport(), { verbose: true });
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
  });

  it('treats a leading --json flag as a value flag during target parsing', () => {
    const dependencies = createDependencies();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runBoundariesCli(['--json', 'extension/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, undefined);
    expect(log).toHaveBeenCalledWith(JSON.stringify(createReport(), null, 2));
    expect(dependencies.reportBoundaries).not.toHaveBeenCalled();

    log.mockRestore();
  });

  it('treats a leading --strict flag as a value flag during target parsing', () => {
    const dependencies = createDependencies();

    runBoundariesCli(['--strict', 'extension/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, undefined);
    expect(dependencies.reportBoundaries).toHaveBeenCalledWith(createReport(), { verbose: false });
    expect(dependencies.setExitCode).not.toHaveBeenCalled();
  });

  it('fails for layer violations even without dead ends or strict mode', () => {
    const dependencies = createDependencies({
      ...createReport(),
      layerViolations: [
        {
          from: 'packages/extension/src/core/bad.ts',
          reason: 'core cannot depend on webview',
          to: 'packages/extension/src/webview/view.ts',
        },
      ],
    });

    runBoundariesCli(['extension/'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
  });

  it('fails for dead ends even when there are no layer violations', () => {
    const dependencies = createDependencies({
      ...createReport(),
      deadEnds: [
        {
          absolutePath: `${REPO_ROOT}/packages/extension/src/shared/isolated.ts`,
          entrypoint: false,
          incoming: 0,
          outgoing: 0,
          relativePath: 'packages/extension/src/shared/isolated.ts',
        },
      ],
    });

    runBoundariesCli(['extension/'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
  });

  it('fails in strict mode when only dead surfaces are present', () => {
    const dependencies = createDependencies({
      ...createReport(),
      deadSurfaces: [
        {
          absolutePath: `${REPO_ROOT}/packages/extension/src/shared/orphan.ts`,
          entrypoint: false,
          incoming: 0,
          outgoing: 1,
          relativePath: 'packages/extension/src/shared/orphan.ts',
        },
      ],
    });

    runBoundariesCli(['extension/', '--strict'], dependencies);

    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);
  });

  it('does not fail in strict mode when dead surfaces are absent', () => {
    const dependencies = createDependencies();

    runBoundariesCli(['extension/', '--strict'], dependencies);

    expect(dependencies.setExitCode).not.toHaveBeenCalled();
  });

  it('does not fail for dead surfaces when strict mode is absent', () => {
    const dependencies = createDependencies({
      ...createReport(),
      deadSurfaces: [
        {
          absolutePath: `${REPO_ROOT}/packages/extension/src/shared/orphan.ts`,
          entrypoint: false,
          incoming: 0,
          outgoing: 1,
          relativePath: 'packages/extension/src/shared/orphan.ts',
        },
      ],
    });

    runBoundariesCli(['extension/'], dependencies);

    expect(dependencies.setExitCode).not.toHaveBeenCalled();
  });

  it('prints JSON and sets a failure exit code when violations exist', () => {
    const report = {
      ...createReport(),
      deadEnds: [
        {
          absolutePath: `${REPO_ROOT}/packages/extension/src/shared/isolated.ts`,
          entrypoint: false,
          incoming: 0,
          outgoing: 0,
          relativePath: 'packages/extension/src/shared/isolated.ts'
        }
      ],
      layerViolations: [
        {
          from: 'packages/extension/src/core/bad.ts',
          reason: 'core cannot depend on webview',
          to: 'packages/extension/src/webview/view.ts'
        }
      ]
    } satisfies BoundaryReport;
    const dependencies = createDependencies(report);
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    runBoundariesCli(['--json', '--strict', 'extension/'], dependencies);

    expect(log).toHaveBeenCalledTimes(1);
    expect(dependencies.reportBoundaries).not.toHaveBeenCalled();
    expect(dependencies.setExitCode).toHaveBeenCalledWith(1);

    log.mockRestore();
  });
});
