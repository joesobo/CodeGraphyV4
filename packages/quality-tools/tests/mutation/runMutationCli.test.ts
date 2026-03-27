import { describe, expect, it, vi } from 'vitest';
import {
  runMutationCli,
  type MutationCliDependencies
} from '../../src/mutation/runMutationCli';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import type { QualityTarget } from '../../src/shared/resolveTarget';

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

function createDependencies(): MutationCliDependencies {
  return {
    discoverMutationPackageNames: vi.fn(() => ['plugin-godot', 'quality-tools']),
    resolveQualityTarget: vi.fn((_repoRoot: string, input?: string) => packageTarget(input ?? 'quality-tools')),
    runMutation: vi.fn()
  };
}

describe('runMutationCli', () => {
  it('runs a single explicit target', () => {
    const dependencies = createDependencies();
    runMutationCli(['quality-tools/'], dependencies);

    expect(dependencies.resolveQualityTarget).toHaveBeenCalledWith(REPO_ROOT, 'quality-tools/');
    expect(dependencies.runMutation).toHaveBeenCalledTimes(1);
  });

  it('runs all discovered packages when no target is provided', () => {
    const dependencies = createDependencies();
    runMutationCli([], dependencies);

    expect(dependencies.discoverMutationPackageNames).toHaveBeenCalledWith(REPO_ROOT);
    expect(dependencies.resolveQualityTarget).toHaveBeenNthCalledWith(1, REPO_ROOT, 'plugin-godot');
    expect(dependencies.resolveQualityTarget).toHaveBeenNthCalledWith(2, REPO_ROOT, 'quality-tools');
    expect(dependencies.runMutation).toHaveBeenCalledTimes(2);
  });
});
