import type { DatabaseSnapshot } from '../../src/database/model';

export function createSampleSnapshot(): DatabaseSnapshot {
  return {
    files: [],
    symbols: [
      {
        id: 'symbol:src/a.ts:exportAsJson',
        name: 'exportAsJson',
        kind: 'function',
        filePath: 'src/a.ts',
      },
      {
        id: 'symbol:src/b.ts:useExport',
        name: 'useExport',
        kind: 'function',
        filePath: 'src/b.ts',
      },
      {
        id: 'symbol:src/c.ts:runner',
        name: 'runner',
        kind: 'function',
        filePath: 'src/c.ts',
      },
    ],
    relations: [
      {
        kind: 'import',
        sourceId: 'ts:import',
        fromFilePath: 'src/b.ts',
        toFilePath: 'src/a.ts',
        fromSymbolId: 'symbol:src/b.ts:useExport',
        toSymbolId: 'symbol:src/a.ts:exportAsJson',
      },
      {
        kind: 'call',
        sourceId: 'ts:call',
        fromFilePath: 'src/c.ts',
        toFilePath: 'src/b.ts',
        fromSymbolId: 'symbol:src/c.ts:runner',
        toSymbolId: 'symbol:src/b.ts:useExport',
      },
    ],
  };
}
