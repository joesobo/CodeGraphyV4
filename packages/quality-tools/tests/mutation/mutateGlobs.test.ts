import { describe, expect, it } from 'vitest';
import { buildMutateGlobs } from '../../src/mutation/mutateGlobs';
import { REPO_ROOT } from '../../src/shared/repoRoot';
import { resolveQualityTarget } from '../../src/shared/resolveTarget';

describe('buildMutateGlobs', () => {
  it('uses a direct file include for file targets', () => {
    const globs = buildMutateGlobs(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/src/shared/sourceScope.ts'),
      {
        include: ['packages/quality-tools/src/**/*.ts'],
        exclude: ['packages/quality-tools/src/cli/**/*.ts', 'packages/quality-tools/**/index.ts']
      }
    );

    expect(globs).toEqual([
      'packages/quality-tools/src/shared/sourceScope.ts',
      '!packages/quality-tools/src/cli/**/*.ts',
      '!packages/quality-tools/**/index.ts'
    ]);
  });

  it('uses recursive includes for directory targets', () => {
    const globs = buildMutateGlobs(
      resolveQualityTarget(REPO_ROOT, 'packages/quality-tools/src/shared'),
      {
        include: ['packages/quality-tools/src/**/*.ts'],
        exclude: ['packages/quality-tools/src/cli/**/*.ts']
      }
    );

    expect(globs).toEqual([
      'packages/quality-tools/src/shared/**/*.ts',
      'packages/quality-tools/src/shared/**/*.tsx',
      '!packages/quality-tools/src/cli/**/*.ts'
    ]);
  });

  it('uses package include globs for package targets', () => {
    const globs = buildMutateGlobs(
      resolveQualityTarget(REPO_ROOT, 'quality-tools/'),
      {
        include: ['packages/quality-tools/src/**/*.ts'],
        exclude: ['packages/quality-tools/src/cli/**/*.ts']
      }
    );

    expect(globs).toEqual([
      'packages/quality-tools/src/**/*.ts',
      '!packages/quality-tools/src/cli/**/*.ts'
    ]);
  });
});
