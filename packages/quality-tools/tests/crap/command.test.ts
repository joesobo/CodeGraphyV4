import { describe, expect, it, vi } from 'vitest';
import type { CrapResult } from '../../src/crap/analysis/run';
import type { CoverageProfile } from '../../src/crap/coverage/profiles';
import type { IstanbulFileCoverage } from '../../src/crap/coverage/read';
import { parseThreshold, runCrapCli, type CrapCliDependencies } from '../../src/crap/command';
import { REPO_ROOT } from '../../src/shared/resolve/repoRoot';
import type { QualityTarget } from '../../src/shared/resolve/target';

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

describe('command', () => {
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

  it('resolves the target after a leading threshold flag and value', () => {
    const dependencies = createDependencies(packageTarget(), [], []);

    runCrapCli(['--threshold', '12', 'quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.analyzeCrap).toHaveBeenCalledWith([], REPO_ROOT, 'packages/quality-tools/src', 12);
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

describe('mutation killers for command.ts', () => {
  it('kills mutation: args array literal is exact', () => {
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

    runCrapCli(['--', 'quality-tools/'], dependencies);

    // Verify the exact args array ['vitest'] is passed
    expect(dependencies.runCommand).toHaveBeenCalledWith('pnpm', ['vitest'], REPO_ROOT);
  });

  it('kills mutation: --threshold string literal is exact', () => {
    const target = packageTarget();
    const profiles = [
      {
        args: ['test'],
        command: 'npm',
        coveragePath: '/coverage/test.json',
        cwd: REPO_ROOT
      }
    ];
    const dependencies = createDependencies(target, profiles, []);

    // Pass explicit threshold with --threshold flag
    runCrapCli(['--', 'quality-tools/', '--threshold', '15'], dependencies);

    // Verify that --threshold flag is parsed correctly
    const analyzeCrapCall = (dependencies.analyzeCrap as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(analyzeCrapCall?.[3]).toBe(15);
  });

  it('kills mutation: different flag string is not parsed as threshold', () => {
    // Verify that parseThreshold only recognizes '--threshold' not other variations
    expect(parseThreshold(['--threshold', '5'])).toBe(5);
    expect(parseThreshold(['--thresh', '99'])).toBe(8); // Should use default
    expect(parseThreshold(['threshold', '99'])).toBe(8); // Should use default
  });

  it('kills L38:84-L38:99 array literal flags are exact', () => {
    // The array literal at line 38: ['--threshold']
    // parseTargetArg is called with this exact array
    // Tests that the flag string '--threshold' is passed, not other variations
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

    // When we pass '--threshold', parseTargetArg should skip it as a flag
    runCrapCli(['--', 'quality-tools/', '--threshold', '10'], dependencies);

    // Verify the exact array was used
    const resolveCall = (dependencies.resolveQualityTarget as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(resolveCall).toBeDefined();
    // parseTargetArg should return 'quality-tools/' as the target, skipping --threshold
    expect(resolveCall?.[1]).toBe('quality-tools/');
  });

  it('kills L38:85-L38:98 string literal --threshold is exact', () => {
    // The string literal at line 38: '--threshold' in the array
    // This specific flag string must be recognized by parseTargetArg
    const target = packageTarget();
    const profiles = [
      {
        args: ['test'],
        command: 'npm',
        coveragePath: '/coverage/test.json',
        cwd: REPO_ROOT
      }
    ];
    const dependencies = createDependencies(target, profiles, []);

    // Verify that --threshold is correctly recognized
    runCrapCli(['--', 'quality-tools/', '--threshold', '20'], dependencies);

    // The parseThreshold should extract 20
    const crapCall = (dependencies.analyzeCrap as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(crapCall?.[3]).toBe(20);
  });
});
