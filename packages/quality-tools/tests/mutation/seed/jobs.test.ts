import { mkdtempSync, mkdirSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  discoverMutationSeedJobMatrix,
  discoverMutationSeedJobs,
  extensionMutationSeedJobs,
} from '../../../src/mutation/seed/jobs';

function createRepo(): string {
  const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-seed-jobs-'));
  for (const packageName of ['extension', 'plugin-a', 'plugin-b', 'no-tests']) {
    mkdirSync(join(repoRoot, 'packages', packageName, 'src'), { recursive: true });
    writeFileSync(join(repoRoot, 'packages', packageName, 'package.json'), '{}');
  }

  mkdirSync(join(repoRoot, 'packages/plugin-a/tests'), { recursive: true });
  mkdirSync(join(repoRoot, 'packages/plugin-b/tests'), { recursive: true });

  return repoRoot;
}

describe('extensionMutationSeedJobs', () => {
  it('keeps webview as one shard and splits the host side by runtime area', () => {
    expect(extensionMutationSeedJobs.map(job => job.shard)).toEqual([
      'host-graphview-provider',
      'host-graphview-model',
      'host-indexing',
      'host-platform-core-shared',
      'webview',
    ]);

    expect(extensionMutationSeedJobs.find(job => job.shard === 'webview')?.mutate).toEqual([
      'packages/extension/src/webview/**/*.ts',
      'packages/extension/src/webview/**/*.tsx',
    ]);
  });
});

describe('discoverMutationSeedJobs', () => {
  it('uses package jobs for regular packages and shard jobs for extension', () => {
    expect(discoverMutationSeedJobs(createRepo())).toEqual([
      {
        mutate: ['packages/plugin-a/src/**/*.ts', 'packages/plugin-a/src/**/*.tsx'],
        package: 'plugin-a',
        shard: 'plugin-a',
        testIncludes: ['packages/plugin-a/tests/**/*.test.ts', 'packages/plugin-a/tests/**/*.test.tsx'],
      },
      {
        mutate: ['packages/plugin-b/src/**/*.ts', 'packages/plugin-b/src/**/*.tsx'],
        package: 'plugin-b',
        shard: 'plugin-b',
        testIncludes: ['packages/plugin-b/tests/**/*.test.ts', 'packages/plugin-b/tests/**/*.test.tsx'],
      },
      ...extensionMutationSeedJobs,
    ]);
  });
});

describe('discoverMutationSeedJobMatrix', () => {
  it('returns only package and shard fields for GitHub Actions matrix values', () => {
    expect(discoverMutationSeedJobMatrix(createRepo()).at(-1)).toEqual({
      package: 'extension',
      shard: 'webview',
    });
  });
});
