import { describe, expect, it, vi } from 'vitest';
import {
  prepareCodeGraphyMutationRun,
  resolveScopedVitestIncludes,
  runCodeGraphyMutationCli,
  type QualityTarget,
} from '../../../../../scripts/mutation/codegraphyMutate';

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

describe('resolveScopedVitestIncludes', () => {
  it('returns focused test includes for file targets', () => {
    const includes = resolveScopedVitestIncludes(fileTarget('packages/extension/src/webview/vscodeApi.ts'));

    expect(includes).toContain('packages/extension/tests/webview/vscodeApi.test.ts');
    expect(includes).toContain('packages/extension/tests/webview/vscodeApi.mutations.test.ts');
    expect(includes).not.toContain('packages/extension/tests/webview/**/*.test.ts');
  });

  it('finds source-colocated tests for package file targets', () => {
    const includes = resolveScopedVitestIncludes(fileTarget(
      'packages/tldraw/src/script/main.ts',
      'tldraw',
    ));

    expect(includes).toContain('packages/tldraw/src/script/main.test.ts');
  });
});

describe('runCodeGraphyMutationCli', () => {
  it('delegates the scoped target to the local mutation runner', async () => {
    const runQualityToolsMutate = vi.fn(async () => undefined);

    await runCodeGraphyMutationCli(['extension', 'src/webview/vscodeApi.ts'], {
      repoRoot: REPO_ROOT,
      resolveQualityTarget: createResolveQualityTarget(),
      runQualityToolsMutate,
    });

    expect(runQualityToolsMutate).toHaveBeenCalledWith([
      'packages/extension/src/webview/vscodeApi.ts',
    ], expect.objectContaining({
      cwd: REPO_ROOT,
      env: expect.objectContaining({
        CODEGRAPHY_MUTATION_RUN: '1',
        CODEGRAPHY_VITEST_SCOPE: 'extension',
        CODEGRAPHY_VITEST_INCLUDE_JSON: expect.stringContaining('packages/extension/tests/webview/vscodeApi.test.ts'),
      }),
    }));
  });

  it('passes no-target invocations through so the external runner owns the error message', async () => {
    const runQualityToolsMutate = vi.fn(async () => undefined);

    await runCodeGraphyMutationCli([], {
      repoRoot: REPO_ROOT,
      resolveQualityTarget: createResolveQualityTarget(),
      runQualityToolsMutate,
    });

    expect(runQualityToolsMutate).toHaveBeenCalledWith([], expect.any(Object));
  });
});
