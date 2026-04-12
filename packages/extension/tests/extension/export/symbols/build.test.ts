import { describe, expect, it } from 'vitest';
import {
  buildSymbolsExportData,
  buildSymbolsExportDataFromSnapshot,
} from '../../../../src/extension/export/symbols/build';

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
        {
          kind: 'call',
          sourceId: 'core:treesitter',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/lib.ts',
          fromSymbolId: 'symbol:src/app.ts:activate',
          toSymbolId: 'symbol:src/lib.ts:boot',
        },
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
        {
          kind: 'call',
          sourceId: 'core:treesitter',
          fromFilePath: '/workspace/src/app.ts',
          toFilePath: '/workspace/src/lib.ts',
          fromSymbolId: 'symbol:src/app.ts:activate',
          toSymbolId: 'symbol:src/lib.ts:boot',
        },
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
        kind: 'call',
        sourceId: 'core:treesitter',
        fromFilePath: 'src/app.ts',
        toFilePath: 'src/lib.ts',
        fromSymbolId: 'symbol:src/app.ts:activate',
        toSymbolId: 'symbol:src/lib.ts:boot',
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
        {
          kind: 'import',
          sourceId: 'core:treesitter',
          fromFilePath: '/repo/src/app.ts',
          toFilePath: '/repo/src/createFolder.ts',
        },
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
        {
          kind: 'call',
          sourceId: 'core:treesitter',
          fromFilePath: '/repo/src/utils/fileTree.ts',
          toFilePath: '/repo/src/utils/createFolder.ts',
          fromSymbolId: 'symbol:src/utils/fileTree.ts:onCreate',
          toSymbolId: 'symbol:src/utils/createFolder.ts:createFolder',
        },
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
            "fromFilePath": "src/utils/fileTree.ts",
            "fromSymbolId": "symbol:src/utils/fileTree.ts:onCreate",
            "kind": "call",
            "sourceId": "core:treesitter",
            "toFilePath": "src/utils/createFolder.ts",
            "toSymbolId": "symbol:src/utils/createFolder.ts:createFolder",
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
});
