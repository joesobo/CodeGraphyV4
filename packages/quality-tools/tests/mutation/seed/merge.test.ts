import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import {
  mergeMutationSeedReports,
  writeMutationSeedReports,
} from '../../../src/mutation/seed/merge';

function createReport(options: {
  fileName: string;
  killedBy: string[];
  source?: string;
  testFileName: string;
  testId: string;
  testName: string;
}): unknown {
  return {
    config: { thresholds: { high: 90 } },
    files: {
      [options.fileName]: {
        language: 'typescript',
        mutants: [
          {
            coveredBy: options.killedBy,
            id: '0',
            killedBy: options.killedBy,
            location: {
              end: { column: 1, line: 1 },
              start: { column: 0, line: 1 },
            },
            mutatorName: 'StringLiteral',
            replacement: '"mutated"',
            status: 'Killed',
            testsCompleted: 1,
          },
        ],
        source: options.source ?? 'export const value = "original";\n',
      },
    },
    framework: { name: 'stryker-js' },
    projectRoot: '/repo',
    schemaVersion: '1.0',
    testFiles: {
      [options.testFileName]: {
        source: `it(${JSON.stringify(options.testName)}, () => undefined);\n`,
        tests: [
          {
            id: options.testId,
            name: options.testName,
          },
        ],
      },
    },
    thresholds: { high: 90 },
  };
}

describe('mergeMutationSeedReports', () => {
  it('unions source files from shard reports and rewrites test ids to avoid collisions', () => {
    const merged = mergeMutationSeedReports([
      createReport({
        fileName: 'packages/extension/src/extension/a.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/extension/a.test.ts',
        testId: '0',
        testName: 'kills a',
      }),
      createReport({
        fileName: 'packages/extension/src/webview/b.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/webview/b.test.ts',
        testId: '0',
        testName: 'kills b',
      }),
    ]);

    expect(Object.keys(merged.files)).toEqual([
      'packages/extension/src/extension/a.ts',
      'packages/extension/src/webview/b.ts',
    ]);
    expect(merged.files['packages/extension/src/extension/a.ts'].mutants[0].killedBy).toEqual(['0']);
    expect(merged.files['packages/extension/src/webview/b.ts'].mutants[0].killedBy).toEqual(['1']);
    expect(merged.testFiles['packages/extension/tests/webview/b.test.ts'].tests[0].id).toBe('1');
  });

  it('keeps duplicated test-file entries addressable when shards include the same test file', () => {
    const merged = mergeMutationSeedReports([
      createReport({
        fileName: 'packages/extension/src/extension/a.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/shared/same.test.ts',
        testId: '0',
        testName: 'shared test',
      }),
      createReport({
        fileName: 'packages/extension/src/shared/b.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/shared/same.test.ts',
        testId: '0',
        testName: 'shared test',
      }),
    ]);

    expect(merged.testFiles['packages/extension/tests/shared/same.test.ts'].tests).toEqual([
      { id: '0', name: 'shared test' },
      { id: '1', name: 'shared test' },
    ]);
    expect(merged.files['packages/extension/src/shared/b.ts'].mutants[0].coveredBy).toEqual(['1']);
  });
});

describe('writeMutationSeedReports', () => {
  it('copies package reports and merges extension shard reports into the canonical package file', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'quality-tools-mutation-seed-merge-'));
    const inputRoot = join(repoRoot, 'package-seeds');
    const outputRoot = join(repoRoot, 'reports/mutation');
    const extensionShardA = join(inputRoot, 'mutation-seed-extension-webview');
    const extensionShardB = join(inputRoot, 'mutation-seed-extension-host');
    const pluginSeed = join(inputRoot, 'mutation-seed-plugin-a');
    mkdirSync(extensionShardA, { recursive: true });
    mkdirSync(extensionShardB, { recursive: true });
    mkdirSync(pluginSeed, { recursive: true });
    writeFileSync(
      join(extensionShardA, 'stryker-incremental-extension.json'),
      JSON.stringify(createReport({
        fileName: 'packages/extension/src/webview/a.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/webview/a.test.ts',
        testId: '0',
        testName: 'kills webview',
      })),
    );
    writeFileSync(
      join(extensionShardB, 'stryker-incremental-extension.json'),
      JSON.stringify(createReport({
        fileName: 'packages/extension/src/extension/b.ts',
        killedBy: ['0'],
        testFileName: 'packages/extension/tests/extension/b.test.ts',
        testId: '0',
        testName: 'kills host',
      })),
    );
    writeFileSync(
      join(pluginSeed, 'stryker-incremental-plugin-a.json'),
      JSON.stringify(createReport({
        fileName: 'packages/plugin-a/src/plugin.ts',
        killedBy: ['0'],
        testFileName: 'packages/plugin-a/tests/plugin.test.ts',
        testId: '0',
        testName: 'kills plugin',
      })),
    );

    const written = writeMutationSeedReports({ inputRoot, outputRoot, sha: 'abc123' });

    expect(written.sort()).toEqual([
      'reports/mutation/extension/stryker-incremental-extension.json',
      'reports/mutation/plugin-a/stryker-incremental-plugin-a.json',
      'reports/mutation/seed-sha.txt',
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
