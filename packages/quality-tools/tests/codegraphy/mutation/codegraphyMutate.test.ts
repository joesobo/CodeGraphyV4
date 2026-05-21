import { describe, expect, it, vi } from 'vitest';
import {
  prepareCodeGraphyMutationRun,
  runCodeGraphyMutationCli,
} from '../../../../../scripts/mutation/codegraphyMutate';
import type { QualityTarget } from '../../../src/shared/resolve/target';

const REPO_ROOT = '/repo';

function packageTarget(packageName: string): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/packages/${packageName}`,
    kind: 'package',
    packageName,
    packageRelativePath: '.',
    packageRoot: `${REPO_ROOT}/packages/${packageName}`,
    relativePath: `packages/${packageName}`,
  };
}

function fileTarget(relativePath: string, packageName = 'extension'): QualityTarget {
  return {
    absolutePath: `${REPO_ROOT}/${relativePath}`,
    kind: 'file',
    packageName,
    packageRelativePath: relativePath.replace(`packages/${packageName}/`, ''),
    packageRoot: `${REPO_ROOT}/packages/${packageName}`,
    relativePath,
  };
}

function createResolveQualityTarget() {
  return vi.fn((_repoRoot: string, input?: string) => {
    if (input === 'extension/' || input === 'extension') {
      return packageTarget('extension');
    }

    if (input?.startsWith('packages/plugin-godot/')) {
      return fileTarget(input, 'plugin-godot');
    }

    return fileTarget(input ?? 'packages/extension/src/webview/vscodeApi.ts');
  });
}

describe('prepareCodeGraphyMutationRun', () => {
  it('treats PACKAGE FILE as a scoped file mutation and forwards the file target', () => {
    const resolveQualityTarget = createResolveQualityTarget();

    const preparedRun = prepareCodeGraphyMutationRun([
      'extension',
      'src/webview/vscodeApi.ts',
      '--force',
    ], {
      repoRoot: REPO_ROOT,
      resolveQualityTarget,
    });

    expect(preparedRun.target).toMatchObject({
      kind: 'file',
      packageName: 'extension',
      relativePath: 'packages/extension/src/webview/vscodeApi.ts',
    });
    expect(preparedRun.forwardedArgs).toEqual([
      'packages/extension/src/webview/vscodeApi.ts',
      '--force',
    ]);
  });

  it('lets --mutate define the effective mutation target', () => {
    const resolveQualityTarget = createResolveQualityTarget();

    const preparedRun = prepareCodeGraphyMutationRun([
      'extension',
      '--mutate',
      'packages/extension/src/webview/components/Graph.tsx',
    ], {
      repoRoot: REPO_ROOT,
      resolveQualityTarget,
    });

    expect(preparedRun.target).toMatchObject({
      relativePath: 'packages/extension/src/webview/components/Graph.tsx',
    });
    expect(preparedRun.forwardedArgs).toEqual([
      'extension',
      '--mutate',
      'packages/extension/src/webview/components/Graph.tsx',
    ]);
  });

  it('rejects scoped targets that resolve outside the package hint', () => {
    const resolveQualityTarget = createResolveQualityTarget();

    expect(() => prepareCodeGraphyMutationRun([
      'extension',
      'packages/plugin-godot/src/plugin.ts',
    ], {
      repoRoot: REPO_ROOT,
      resolveQualityTarget,
    })).toThrow('resolves to plugin-godot, not extension');
  });
});

describe('runCodeGraphyMutationCli', () => {
  it('hydrates the target package before delegating to the generic mutation runner', async () => {
    const hydrateMutationSeed = vi.fn();
    const runMutationCli = vi.fn(async () => undefined);

    await runCodeGraphyMutationCli(['extension', 'src/webview/vscodeApi.ts'], {
      hydrateMutationSeed,
      repoRoot: REPO_ROOT,
      resolveQualityTarget: createResolveQualityTarget(),
      runMutationCli,
    });

    expect(hydrateMutationSeed).toHaveBeenCalledWith({
      packageName: 'extension',
      repoRoot: REPO_ROOT,
    });
    expect(runMutationCli).toHaveBeenCalledWith([
      'packages/extension/src/webview/vscodeApi.ts',
    ]);
  });

  it('passes no-target invocations through so the generic runner owns the error message', async () => {
    const hydrateMutationSeed = vi.fn();
    const runMutationCli = vi.fn(async () => undefined);

    await runCodeGraphyMutationCli([], {
      hydrateMutationSeed,
      repoRoot: REPO_ROOT,
      resolveQualityTarget: createResolveQualityTarget(),
      runMutationCli,
    });

    expect(hydrateMutationSeed).not.toHaveBeenCalled();
    expect(runMutationCli).toHaveBeenCalledWith([]);
  });
});
