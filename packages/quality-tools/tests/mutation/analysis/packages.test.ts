import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { discoverMutationPackageNames } from '../../../src/mutation/analysis/packages';

function createRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-packages-'));
  for (const packageName of ['extension', 'plugin-a', 'plugin-b', 'no-src', 'no-tests', 'tests-only']) {
    mkdirSync(join(repoRoot, 'packages', packageName), { recursive: true });
    writeFileSync(join(repoRoot, 'packages', packageName, 'package.json'), '{}');
  }

  mkdirSync(join(repoRoot, 'packages/extension/src'));
  mkdirSync(join(repoRoot, 'packages/plugin-a/src'));
  mkdirSync(join(repoRoot, 'packages/plugin-b/src'));
  mkdirSync(join(repoRoot, 'packages/no-tests/src'));
  mkdirSync(join(repoRoot, 'packages/plugin-a/tests'));
  mkdirSync(join(repoRoot, 'packages/plugin-b/__tests__'));
  mkdirSync(join(repoRoot, 'packages/tests-only/tests'));

  return repoRoot;
}

describe('discoverMutationPackageNames', () => {
  it('includes source packages with tests and keeps extension last', () => {
    expect(discoverMutationPackageNames(createRepo())).toEqual([
      'plugin-a',
      'plugin-b',
      'extension'
    ]);
  });
});
