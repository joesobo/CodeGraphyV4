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
    resolveQualityTarget: vi.fn((_repoRoot: string, input?: string) => (
      input === '.'
        ? repoTarget()
        : input?.startsWith('packages/extension/src/')
        ? fileTarget(input)
        : packageTarget(input ?? 'quality-tools')
    )),
    runMutation: vi.fn(async () => undefined),
  };
}

describe('command', () => {
  it('runs a package target directly', async () => {
    const dependencies = createDependencies();
    await runMutationCli(['quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.runMutation).toHaveBeenCalledTimes(1);
  });

  it('runs a single file target', async () => {
    const dependencies = createDependencies();
    await runMutationCli(['packages/extension/src/webview/vscodeApi.ts'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(
      REPO_ROOT,
      'packages/extension/src/webview/vscodeApi.ts',
    );
    expect(dependencies.runMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'file',
        relativePath: 'packages/extension/src/webview/vscodeApi.ts',
      }),
      { force: false },
    );
  });

  it('passes force reruns through to the mutation runner', async () => {
    const dependencies = createDependencies();
    await runMutationCli(['--force', 'packages/extension/src/webview/vscodeApi.ts'], dependencies);

    expect(dependencies.runMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'file',
        relativePath: 'packages/extension/src/webview/vscodeApi.ts',
      }),
      { force: true },
    );
  });

  it('fails fast when no target is provided', async () => {
    const dependencies = createDependencies();

    await expect(runMutationCli([], dependencies)).rejects.toThrow(
      'Mutation requires an explicit package, directory, or file target.',
    );
    expect(dependencies.resolveQualityTarget).not.toHaveBeenCalled();
    expect(dependencies.runMutation).not.toHaveBeenCalled();
  });

  it('uses --mutate as the effective mutation target', async () => {
    const dependencies = createDependencies();

    await runMutationCli([
      'extension/',
      '--mutate',
      'packages/extension/src/webview/components/Graph.tsx',
    ], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(
      REPO_ROOT,
      'packages/extension/src/webview/components/Graph.tsx',
    );
    expect(dependencies.runMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'file',
        relativePath: 'packages/extension/src/webview/components/Graph.tsx',
      }),
      { force: false },
    );
  });

  it('fails fast for repo-wide targets before running mutation', async () => {
    const dependencies = createDependencies();

    await expect(runMutationCli(['.'], dependencies)).rejects.toThrow(
      'Mutation requires a workspace package, directory, or file inside one.',
    );
    expect(dependencies.runMutation).not.toHaveBeenCalled();
  });
});
