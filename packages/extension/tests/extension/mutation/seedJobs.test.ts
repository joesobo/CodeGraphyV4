import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildQualityToolsMutationArgs } from '../../../../../scripts/mutation/runSeedJob';
import {
  discoverMutationSeedJobMatrix,
  discoverMutationSeedJobs,
  extensionMutationSeedJobs,
} from '../../../../../scripts/mutation/seedJobs';
import {
  mergeMutationSeedReports,
  writeMutationSeedReports,
} from '../../../../../scripts/mutation/seedMerge';
import { REPO_ROOT } from '../../../../../scripts/mutation/paths';

const require = createRequire(import.meta.url);

function createReport(options: {
  fileName: string;
  killedBy: string[];
  testFileName: string;
  testId: string;
}): unknown {
  return {
    files: {
      [options.fileName]: {
        mutants: [
          {
            coveredBy: options.killedBy,
            killedBy: options.killedBy,
          },
        ],
      },
    },
    testFiles: {
      [options.testFileName]: {
        tests: [
          {
            id: options.testId,
            name: `kills ${options.fileName}`,
          },
        ],
      },
    },
  };
}

describe('mutation seed jobs', () => {
  it('splits extension seed jobs while keeping regular packages as package shards', () => {
    const jobs = discoverMutationSeedJobs(REPO_ROOT);

    expect(extensionMutationSeedJobs.map((job) => job.shard)).toEqual([
      'host-graphview-provider',
      'host-graphview-model',
      'host-indexing',
      'host-platform-core-shared',
      'webview',
    ]);
    expect(jobs).toContainEqual(expect.objectContaining({
      package: 'core',
      shard: 'core',
    }));
    expect(jobs).toContainEqual(expect.objectContaining({
      package: 'extension',
      shard: 'webview',
    }));
  });

  it('returns package and shard fields for the GitHub Actions matrix', () => {
    expect(discoverMutationSeedJobMatrix(REPO_ROOT)).toContainEqual({
      package: 'extension',
      shard: 'webview',
    });
  });
});

describe('runSeedJob script', () => {
  it('forwards seed job mutate and test include scopes to quality-tools', () => {
    expect(buildQualityToolsMutationArgs({
      mutate: ['packages/plugin-typescript/src/**/*.ts'],
      package: 'plugin-typescript',
      shard: 'plugin-typescript',
      testIncludes: ['packages/plugin-typescript/tests/**/*.test.ts'],
    })).toEqual([
      'plugin-typescript/',
      '--mutate-globs-json',
      JSON.stringify(['packages/plugin-typescript/src/**/*.ts']),
      '--test-includes-json',
      JSON.stringify(['packages/plugin-typescript/tests/**/*.test.ts']),
    ]);
  });

  it('loads through tsx before validating required flags', () => {
    const result = spawnSync('pnpm', ['exec', 'tsx', 'scripts/mutation/runSeedJob.ts'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Missing required --package value.');
    expect(result.stderr).not.toContain('Transform failed');
  });
});

describe('stryker seed configs', () => {
  it('keeps the workspace seed config open to non-extension package tests', () => {
    const config = require('../../../../../stryker.config.cjs') as {
      vitest?: { configFile?: string; dir?: string };
    };

    expect(config.vitest?.configFile).toBe('packages/extension/vitest.config.ts');
    expect(config.vitest?.dir).toBeUndefined();
  });

  it('keeps the extension package config open to repo-relative test includes', () => {
    const config = require('../../../../../stryker.extension.config.cjs') as {
      vitest?: { configFile?: string; dir?: string };
    };

    expect(config.vitest?.configFile).toBe('packages/extension/vitest.config.ts');
    expect(config.vitest?.dir).toBeUndefined();
  });
});

describe('mergeMutationSeedReports', () => {
  it('unions source files from shard reports and rewrites test ids to avoid collisions', () => {
    const merged = mergeMutationSeedReports([
      createReport({
        fileName: 'packages/extension/src/extension/a.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/extension/a.test.ts',
        testId: '0',
      }),
      createReport({
        fileName: 'packages/extension/src/webview/b.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/webview/b.test.ts',
        testId: '0',
      }),
    ]);

    expect(Object.keys(merged.files)).toEqual([
      'packages/extension/src/extension/a.ts',
      'packages/extension/src/webview/b.ts',
    ]);
    expect(merged.files['packages/extension/src/extension/a.ts'].mutants[0].killedBy).toEqual(['0']);
    expect(merged.files['packages/extension/src/webview/b.ts'].mutants[0].killedBy).toEqual(['1']);
  });
});

describe('writeMutationSeedReports', () => {
  it('merges extension shard reports into the canonical package seed file', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'codegraphy-mutation-seed-merge-'));
    const inputRoot = join(repoRoot, 'package-seeds');
    const outputRoot = join(repoRoot, 'reports/quality-tools/mutation');
    const extensionShardA = join(inputRoot, 'mutation-seed-extension-webview');
    const extensionShardB = join(inputRoot, 'mutation-seed-extension-host');
    mkdirSync(extensionShardA, { recursive: true });
    mkdirSync(extensionShardB, { recursive: true });
    writeFileSync(
      join(extensionShardA, 'stryker-incremental-extension.json'),
      JSON.stringify(createReport({
        fileName: 'packages/extension/src/webview/a.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/webview/a.test.ts',
        testId: '0',
      })),
    );
    writeFileSync(
      join(extensionShardB, 'stryker-incremental-extension.json'),
      JSON.stringify(createReport({
        fileName: 'packages/extension/src/extension/b.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/extension/b.test.ts',
        testId: '0',
      })),
    );

    const written = writeMutationSeedReports({ inputRoot, outputRoot, sha: 'abc123' });

    expect(written.sort()).toEqual([
      'reports/quality-tools/mutation/extension/stryker-incremental-extension.json',
      'reports/quality-tools/mutation/seed-sha.txt',
    ]);
    expect(readFileSync(join(outputRoot, 'seed-sha.txt'), 'utf8')).toBe('abc123\n');

    const mergedExtension = JSON.parse(
      readFileSync(join(outputRoot, 'extension/stryker-incremental-extension.json'), 'utf8'),
    ) as { files: Record<string, unknown> };
    expect(Object.keys(mergedExtension.files).sort()).toEqual([
      'packages/extension/src/extension/b.ts',
      'packages/extension/src/webview/a.ts',
    ]);
  });
});
