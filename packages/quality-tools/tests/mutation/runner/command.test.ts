import { describe, expect, it, vi } from 'vitest';
import {
  runMutationCli,
  type MutationCliDependencies
} from '../../../src/mutation/runner/command';
import { REPO_ROOT } from '../../../src/shared/resolve/repoRoot';
import type { QualityTarget } from '../../../src/shared/resolve/target';

function packageTarget(packageName: string): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/${packageName}`,
    kind: 'package',
    packageName,
    packageRelativePath: '.',
    packageRoot: `${REPO_ROOT}/packages/${packageName}`,
    relativePath: `packages/${packageName}`
  };
}

function fileTarget(relativePath: string): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/${relativePath}`,
    kind: 'file',
    packageName: 'extension',
    packageRelativePath: relativePath.replace('packages/extension/', ''),
    packageRoot: `${REPO_ROOT}/packages/extension`,
    relativePath,
  };
}

function repoTarget(): QualityTarget {
  return {
    absolutePath: REPO_ROOT,
    kind: 'repo',
    relativePath: '.',
  };
}

function createDependencies(): MutationCliDependencies {
  return {
    discoverMutationPackageNames: vi.fn(() => ['plugin-godot', 'quality-tools']),
    resolveQualityTarget: vi.fn((_repoRoot: string, input?: string) => (
      input === '.'
        ? repoTarget()
        : input?.startsWith('packages/extension/src/')
        ? fileTarget(input)
        : packageTarget(input ?? 'quality-tools')
    )),
    runMutation: vi.fn(),
    runPreflightTypecheck: vi.fn(),
  };
}

describe('command', () => {
  it('runs a single explicit target', () => {
    const dependencies = createDependencies();
    runMutationCli(['quality-tools/'], dependencies);

    expect(dependencies.runPreflightTypecheck).toHaveBeenCalledOnce();
    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.runMutation).toHaveBeenCalledTimes(1);
  });

  it('runs all discovered packages when no target is provided', () => {
    const dependencies = createDependencies();
    runMutationCli([], dependencies);

    expect(dependencies.runPreflightTypecheck).toHaveBeenCalledOnce();
    expect(dependencies.discoverMutationPackageNames).toHaveBeenCalledWith(REPO_ROOT);
    expect(dependencies.resolveQualityTarget).toHaveBeenNthCalledWith(1, REPO_ROOT, 'plugin-godot');
    expect(dependencies.resolveQualityTarget).toHaveBeenNthCalledWith(2, REPO_ROOT, 'quality-tools');
    expect(dependencies.runMutation).toHaveBeenCalledTimes(2);
  });

  it('uses --mutate as the effective mutation target', () => {
    const dependencies = createDependencies();

    runMutationCli([
      'extension/',
      '--mutate',
      'packages/extension/src/webview/components/Graph.tsx',
    ], dependencies);

    expect(dependencies.runPreflightTypecheck).toHaveBeenCalledOnce();
    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(
      REPO_ROOT,
      'packages/extension/src/webview/components/Graph.tsx',
    );
    expect(dependencies.runMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'file',
        relativePath: 'packages/extension/src/webview/components/Graph.tsx',
      }),
    );
  });

  it('fails fast for repo-wide targets before running preflight typecheck', () => {
    const dependencies = createDependencies();

    expect(() => runMutationCli(['.'], dependencies)).toThrow(
      'Mutation requires a workspace package, directory, or file inside one.',
    );
    expect(dependencies.runPreflightTypecheck).not.toHaveBeenCalled();
    expect(dependencies.runMutation).not.toHaveBeenCalled();
  });
});
