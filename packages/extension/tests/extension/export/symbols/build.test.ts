import { describe, expect, it } from 'vitest';
import {
  buildSymbolsExportData,
  buildSymbolsExportDataFromSnapshot,
} from '../../../../src/extension/export/symbols/build';
import type { IAnalysisRelationshipEvidence } from '../../../../src/core/plugins/types/contracts';

function relation(
  edgeType: IAnalysisRelationshipEvidence['edgeType'],
  fromFilePath: string,
  targetFilePath: string,
  sourceSymbolId?: string,
  targetSymbolId?: string,
): IAnalysisRelationshipEvidence {
  return {
    edgeType,
    sourceId: 'core:treesitter',
    from: sourceSymbolId
      ? { kind: 'symbol', symbolId: sourceSymbolId, filePath: fromFilePath }
      : { kind: 'file', filePath: fromFilePath },
    target: targetSymbolId
      ? { kind: 'symbol', symbolId: targetSymbolId, filePath: targetFilePath }
      : { kind: 'file', path: targetFilePath },
  };
}

function withStableTimestamp(jsonText: string): string {
  return jsonText.replace(
    /"exportedAt": "[^"]+"/,
    '"exportedAt": "<timestamp>"',
  );
}

describe('buildSymbolsExportData', () => {
  it('builds a compact symbol export from per-file analysis results', () => {
    const exportData = buildSymbolsExportData(new Map([
      ['src/app.ts', {
        filePath: 'src/app.ts',
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
          relation('call', 'src/app.ts', 'src/lib.ts', 'symbol:src/app.ts:activate', 'symbol:src/lib.ts:boot'),
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
        totalSymbols: 2,
        totalRelations: 1,
      },
      files: [
        { filePath: 'src/app.ts', symbolCount: 1, relationCount: 1 },
        { filePath: 'src/lib.ts', symbolCount: 1, relationCount: 1 },
      ],
    });
    expect(exportData.symbols.map((symbol) => symbol.id)).toEqual([
      'symbol:src/app.ts:activate',
      'symbol:src/lib.ts:boot',
    ]);
    expect(exportData.relations).toEqual([
      {
        edgeType: 'call',
        sourceId: 'core:treesitter',
        from: { kind: 'symbol', symbolId: 'symbol:src/app.ts:activate', filePath: 'src/app.ts' },
        target: { kind: 'symbol', symbolId: 'symbol:src/lib.ts:boot', filePath: 'src/lib.ts' },
      },
    ]);
  });

  it('sorts relations by normalized file and symbol identity fields', () => {
    const exportData = buildSymbolsExportData(new Map([
      ['src/app.ts', {
        filePath: 'src/app.ts',
        relations: [
          relation('call', 'src/lib.ts', 'src/app.ts', 'symbol:src/lib.ts:boot', 'symbol:src/app.ts:activate'),
          relation('call', 'src/app.ts', 'src/lib.ts', 'symbol:src/app.ts:activate', 'symbol:src/lib.ts:boot'),
        ],
      }],
      ['src/lib.ts', {
        filePath: 'src/lib.ts',
      }],
    ]));

    expect(exportData.relations.map((item) => item.from?.kind === 'symbol' ? item.from.filePath : item.from?.kind === 'file' ? item.from.filePath : undefined)).toEqual([
      'src/app.ts',
      'src/lib.ts',
    ]);
  });

  it('sorts files and exported symbols by file path instead of map insertion order', () => {
    const exportData = buildSymbolsExportData(new Map([
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
      ['src/app.ts', {
        filePath: 'src/app.ts',
        symbols: [
          {
            id: 'symbol:src/app.ts:activate',
            name: 'activate',
            kind: 'function',
            filePath: 'src/app.ts',
          },
        ],
      }],
    ]));

    expect(exportData.files.map((file) => file.filePath)).toEqual([
      'src/app.ts',
      'src/lib.ts',
    ]);
    expect(exportData.symbols.map((symbol) => symbol.filePath)).toEqual([
      'src/app.ts',
      'src/lib.ts',
    ]);
  });
});

describe('buildSymbolsExportDataFromSnapshot', () => {
  it('uses the structured snapshot symbol and relation tables when per-file analysis fields are missing', () => {
    const exportData = buildSymbolsExportDataFromSnapshot({
      files: [
        {
          filePath: 'src/app.ts',
          mtime: 1,
          analysis: {
            filePath: 'src/app.ts',
          },
        },
        {
          filePath: 'src/lib.ts',
          mtime: 2,
          analysis: {
            filePath: 'src/lib.ts',
          },
        },
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
        {
          id: 'symbol:src/lib.ts:boot',
          name: 'boot',
          kind: 'function',
          filePath: 'src/lib.ts',
        },
      ],
      relations: [
        relation('call', 'src/app.ts', 'src/lib.ts', 'symbol:src/app.ts:activate', 'symbol:src/lib.ts:boot'),
      ],
    });

    expect(exportData.summary).toEqual({
      totalFiles: 2,
      totalSymbols: 2,
      totalRelations: 1,
    });
    expect(exportData.files).toEqual([
      { filePath: 'src/app.ts', symbolCount: 1, relationCount: 1 },
      { filePath: 'src/lib.ts', symbolCount: 1, relationCount: 1 },
    ]);
  });

  it('normalizes mixed absolute and relative snapshot paths into per-file counts and export rows', () => {
    const exportData = buildSymbolsExportDataFromSnapshot({
      files: [
        {
          filePath: 'src/app.ts',
          mtime: 1,
          analysis: {
            filePath: 'src/app.ts',
          },
        },
        {
          filePath: 'src/lib.ts',
          mtime: 2,
          analysis: {
            filePath: 'src/lib.ts',
          },
        },
      ],
      symbols: [
        {
          id: 'symbol:src/app.ts:activate',
          name: 'activate',
          kind: 'function',
          filePath: '/workspace/src/app.ts',
        },
        {
          id: 'symbol:src/lib.ts:boot',
          name: 'boot',
          kind: 'function',
          filePath: '/workspace/src/lib.ts',
        },
      ],
      relations: [
        relation('call', '/workspace/src/app.ts', '/workspace/src/lib.ts', 'symbol:src/app.ts:activate', 'symbol:src/lib.ts:boot'),
      ],
    });

    expect(exportData.files).toEqual([
      { filePath: 'src/app.ts', symbolCount: 1, relationCount: 1 },
      { filePath: 'src/lib.ts', symbolCount: 1, relationCount: 1 },
    ]);
    expect(exportData.symbols.map((symbol) => symbol.filePath)).toEqual([
      'src/app.ts',
      'src/lib.ts',
    ]);
    expect(exportData.relations).toEqual([
      {
        edgeType: 'call',
        sourceId: 'core:treesitter',
        from: { kind: 'symbol', symbolId: 'symbol:src/app.ts:activate', filePath: 'src/app.ts' },
        target: { kind: 'symbol', symbolId: 'symbol:src/lib.ts:boot', filePath: 'src/lib.ts' },
      },
    ]);
  });

  it('counts both incoming and outgoing relations for each file summary entry', () => {
    const exportData = buildSymbolsExportDataFromSnapshot({
      files: [
        {
          filePath: 'src/createFolder.ts',
          mtime: 1,
          analysis: {
            filePath: 'src/createFolder.ts',
          },
        },
        {
          filePath: 'src/app.ts',
          mtime: 2,
          analysis: {
            filePath: 'src/app.ts',
          },
        },
      ],
      symbols: [
        {
          id: 'symbol:src/createFolder.ts:createFolder',
          name: 'createFolder',
          kind: 'function',
          filePath: '/repo/src/createFolder.ts',
        },
      ],
      relations: [
        relation('import', '/repo/src/app.ts', '/repo/src/createFolder.ts'),
      ],
    });

    expect(exportData.files).toEqual([
      { filePath: 'src/createFolder.ts', symbolCount: 1, relationCount: 1 },
      { filePath: 'src/app.ts', symbolCount: 0, relationCount: 1 },
    ]);
  });

  it('emits a compact json shape without duplicate node data', () => {
    const exportData = buildSymbolsExportDataFromSnapshot({
      files: [
        {
          filePath: 'src/utils/createFolder.ts',
          mtime: 1,
          analysis: {
            filePath: 'src/utils/createFolder.ts',
          },
        },
        {
          filePath: 'src/utils/fileTree.ts',
          mtime: 2,
          analysis: {
            filePath: 'src/utils/fileTree.ts',
          },
        },
      ],
      symbols: [
        {
          id: 'symbol:src/utils/createFolder.ts:createFolder',
          name: 'createFolder',
          kind: 'function',
          filePath: '/repo/src/utils/createFolder.ts',
        },
      ],
      relations: [
        relation('call', '/repo/src/utils/fileTree.ts', '/repo/src/utils/createFolder.ts', 'symbol:src/utils/fileTree.ts:onCreate', 'symbol:src/utils/createFolder.ts:createFolder'),
      ],
    });

    expect(
      JSON.parse(withStableTimestamp(JSON.stringify(exportData, null, 2))),
    ).toMatchInlineSnapshot(`
            {
              "exportedAt": "<timestamp>",
              "files": [
                {
                  "filePath": "src/utils/createFolder.ts",
                  "relationCount": 1,
                  "symbolCount": 1,
                },
                {
                  "filePath": "src/utils/fileTree.ts",
                  "relationCount": 1,
                  "symbolCount": 0,
                },
              ],
              "format": "codegraphy-symbol-export",
              "relations": [
                {
                  "edgeType": "call",
                  "from": {
                    "filePath": "src/utils/fileTree.ts",
                    "kind": "symbol",
                    "symbolId": "symbol:src/utils/fileTree.ts:onCreate",
                  },
                  "sourceId": "core:treesitter",
                  "target": {
                    "filePath": "src/utils/createFolder.ts",
                    "kind": "symbol",
                    "symbolId": "symbol:src/utils/createFolder.ts:createFolder",
                  },
                },
              ],
              "summary": {
                "totalFiles": 2,
                "totalRelations": 1,
                "totalSymbols": 1,
              },
              "symbols": [
                {
                  "filePath": "src/utils/createFolder.ts",
                  "id": "symbol:src/utils/createFolder.ts:createFolder",
                  "kind": "function",
                  "name": "createFolder",
                },
              ],
              "version": "1.0",
            }
          `);
  });

  it('sorts snapshot relations by normalized file and symbol identity fields', () => {
    const exportData = buildSymbolsExportDataFromSnapshot({
      files: [
        {
          filePath: 'src/app.ts',
          mtime: 1,
          analysis: { filePath: 'src/app.ts' },
        },
        {
          filePath: 'src/lib.ts',
          mtime: 2,
          analysis: { filePath: 'src/lib.ts' },
        },
      ],
      symbols: [],
      relations: [
        relation('call', '/repo/src/lib.ts', '/repo/src/app.ts', 'symbol:src/lib.ts:boot', 'symbol:src/app.ts:activate'),
        relation('call', '/repo/src/app.ts', '/repo/src/lib.ts', 'symbol:src/app.ts:activate', 'symbol:src/lib.ts:boot'),
      ],
    });

    expect(exportData.relations.map((item) => item.from?.kind === 'symbol' ? item.from.filePath : item.from?.kind === 'file' ? item.from.filePath : undefined)).toEqual([
      'src/app.ts',
      'src/lib.ts',
    ]);
  });
});
