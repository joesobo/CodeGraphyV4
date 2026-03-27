import { describe, expect, it, vi } from 'vitest';
import type { CrapResult } from '../../src/crap/analyzeCrap';
import type { CoverageProfile } from '../../src/crap/coverageProfiles';
import type { IstanbulFileCoverage } from '../../src/crap/readCoverage';
import { parseThreshold, runCrapCli, type CrapCliDependencies } from '../../src/crap/runCrapCli';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import type { QualityTarget } from '../../src/shared/resolveTarget';

function packageTarget(): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/quality-tools`,
    kind: 'package',
    packageName: 'quality-tools',
    packageRelativePath: '.',
    packageRoot: `${REPO_ROOT}/packages/quality-tools`,
    relativePath: 'packages/quality-tools'
  };
}

function createDependencies(
  target: QualityTarget,
  profiles: CoverageProfile[],
  results: CrapResult[]
): CrapCliDependencies {
  const coverageEntry = (coveragePath: string): Record<string, IstanbulFileCoverage> => ({
    [coveragePath]: {
      path: coveragePath,
      s: {},
      statementMap: {}
    }
  });

  return {
    analyzeCrap: vi.fn(() => results),
    createCoverageProfiles: vi.fn(() => profiles),
    readCoverageReport: vi.fn(coverageEntry),
    reportCrap: vi.fn(),
    resolveQualityTarget: vi.fn(() => target),
    runCommand: vi.fn()
  };
}

describe('runCrapCli', () => {
  it('uses the configured threshold and source scope', () => {
    const target = packageTarget();
    const profiles = [
      {
        args: ['vitest'],
        command: 'pnpm',
        coveragePath: '/coverage/a.json',
        cwd: REPO_ROOT
      }
    ];
    const dependencies = createDependencies(target, profiles, []);

    runCrapCli(['--', 'quality-tools/', '--threshold', '12'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.createCoverageProfiles).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools');
    expect(dependencies.runCommand).toHaveBeenCalledWith('pnpm', ['vitest'], REPO_ROOT);
    expect(dependencies.readCoverageReport).toHaveBeenCalledWith('/coverage/a.json');
    expect(dependencies.analyzeCrap).toHaveBeenCalledTimes(1);
    expect((dependencies.analyzeCrap as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toBe(REPO_ROOT);
    expect((dependencies.analyzeCrap as ReturnType<typeof vi.fn>).mock.calls[0]?.[2]).toBe('packages/quality-tools/src');
    expect((dependencies.analyzeCrap as ReturnType<typeof vi.fn>).mock.calls[0]?.[3]).toBe(12);
    expect(dependencies.reportCrap).toHaveBeenCalledWith([], 12);
  });

  it('defaults the threshold to 8', () => {
    const dependencies = createDependencies(packageTarget(), [], []);
    runCrapCli(['quality-tools/'], dependencies);
    expect(dependencies.analyzeCrap).toHaveBeenCalledWith([], REPO_ROOT, 'packages/quality-tools/src', 8);
  });
});

describe('parseThreshold', () => {
  it('reads an explicit threshold flag', () => {
    expect(parseThreshold(['--threshold', '14'])).toBe(14);
  });

  it('falls back to the default threshold', () => {
    expect(parseThreshold([])).toBe(8);
  });
});
