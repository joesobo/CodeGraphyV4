import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { FunctionInfo } from '../../../src/crap/analysis/extractFunctions';
import type { IstanbulFileCoverage } from '../../../src/crap/coverage/read';

const existingFiles = new Set<string>();
const includedFiles = new Set<string>();
const functionsByFile = new Map<string, FunctionInfo[]>();
const coverageByFunction = new Map<string, number>();
const crapByFunction = new Map<string, number>();

vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    existsSync: vi.fn((filePath: string) => existingFiles.has(filePath))
  };
});

vi.mock('../../../src/crap/analysis/fileSelection', () => ({
  createSourceFile: vi.fn((filePath: string) => ({ fileName: filePath })),
  shouldIncludeFile: vi.fn((filePath: string) => includedFiles.has(filePath))
}));

vi.mock('../../../src/crap/analysis/extractFunctions', () => ({
  extractFunctions: vi.fn((sourceFile: { fileName: string }) => functionsByFile.get(sourceFile.fileName) ?? [])
}));

vi.mock('../../../src/crap/coverage/function', () => ({
  getFunctionCoverage: vi.fn((fn: FunctionInfo, _coverage: IstanbulFileCoverage) => coverageByFunction.get(fn.name) ?? 0)
}));

vi.mock('../../../src/crap/analysis/calculate', () => ({
  calculateCrap: vi.fn((complexity: number, _coverage: number) => crapByFunction.get(String(complexity)) ?? 0)
}));

describe('analyzeCrap aggregation', () => {
  beforeEach(() => {
    existingFiles.clear();
    includedFiles.clear();
    functionsByFile.clear();
    coverageByFunction.clear();
    crapByFunction.clear();
    vi.resetModules();
  });

  it('filters missing files, excludes exact-threshold results, rounds CRAP, and sorts descending', async () => {
    const existingFile = '/repo/packages/example/src/a.ts';
    const secondFile = '/repo/packages/example/src/b.ts';
    const missingFile = '/repo/packages/example/src/missing.ts';

    existingFiles.add(existingFile);
    existingFiles.add(secondFile);
    includedFiles.add(existingFile);
    includedFiles.add(secondFile);
    includedFiles.add(missingFile);

    functionsByFile.set(existingFile, [
      { complexity: 1, endLine: 10, file: secondFile, line: 3, name: 'low' },
      { complexity: 2, endLine: 12, file: existingFile, line: 7, name: 'high' }
    ]);
    functionsByFile.set(secondFile, [
      { complexity: 3, endLine: 8, file: secondFile, line: 2, name: 'threshold' }
    ]);

    coverageByFunction.set('low', 67.4);
    coverageByFunction.set('high', 11.1);
    coverageByFunction.set('threshold', 88.8);
    crapByFunction.set('1', 8.345);
    crapByFunction.set('2', 12.789);
    crapByFunction.set('3', 8);

    const { analyzeCrap } = await import('../../../src/crap/analysis/run');
    const results = analyzeCrap(
      [
        {
          [existingFile]: { path: existingFile, s: {}, statementMap: {} },
          [secondFile]: { path: secondFile, s: {}, statementMap: {} },
          [missingFile]: { path: missingFile, s: {}, statementMap: {} }
        }
      ],
      '/repo',
      'packages/example/src',
      8
    );

    expect(results).toEqual([
      {
        complexity: 2,
        coverage: 11,
        crap: 12.79,
        file: 'packages/example/src/a.ts',
        line: 7,
        name: 'high'
      },
      {
        complexity: 1,
        coverage: 67,
        crap: 8.35,
        file: 'packages/example/src/b.ts',
        line: 3,
        name: 'low'
      }
    ]);
  });
});
