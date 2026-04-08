import { describe, expect, it } from 'vitest';
import { buildSymbolsExportData } from '../../../../src/extension/export/symbols/build';

describe('buildSymbolsExportData', () => {
  it('builds a lightweight symbol export from per-file analysis results', () => {
    const exportData = buildSymbolsExportData(new Map([
      ['src/app.ts', {
        filePath: 'src/app.ts',
        nodes: [
          { id: 'node:file:src/app.ts', nodeType: 'file', label: 'app.ts', filePath: 'src/app.ts' },
        ],
        symbols: [
          {
            id: 'symbol:src/app.ts:activate',
            name: 'activate',
            kind: 'function',
            filePath: 'src/app.ts',
            signature: '(): void',
            range: { startLine: 1, endLine: 3 },
          },
        ],
        relations: [
          {
            kind: 'call',
            sourceId: 'core:treesitter',
            fromFilePath: 'src/app.ts',
            toFilePath: 'src/lib.ts',
            fromSymbolId: 'symbol:src/app.ts:activate',
            toSymbolId: 'symbol:src/lib.ts:boot',
          },
        ],
      }],
      ['src/lib.ts', {
        filePath: 'src/lib.ts',
        symbols: [
          {
            id: 'symbol:src/lib.ts:boot',
            name: 'boot',
            kind: 'function',
            filePath: 'src/lib.ts',
          },
        ],
      }],
    ]));

    expect(exportData).toMatchObject({
      format: 'codegraphy-symbol-export',
      version: '1.0',
      summary: {
        totalFiles: 2,
        totalNodes: 1,
        totalSymbols: 2,
        totalRelations: 1,
      },
      files: [
        { filePath: 'src/app.ts', nodeCount: 1, symbolCount: 1, relationCount: 1 },
        { filePath: 'src/lib.ts', nodeCount: 0, symbolCount: 1, relationCount: 0 },
      ],
    });
    expect(exportData.symbols.map((symbol) => symbol.id)).toEqual([
      'symbol:src/app.ts:activate',
      'symbol:src/lib.ts:boot',
    ]);
    expect(exportData.relations).toEqual([
      {
        kind: 'call',
        sourceId: 'core:treesitter',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
        fromSymbolId: 'symbol:src/app.ts:activate',
        toSymbolId: 'symbol:src/lib.ts:boot',
      },
    ]);
  });
});
