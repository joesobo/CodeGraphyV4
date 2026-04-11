import { describe, expect, it } from 'vitest';
import {
  buildSymbolsExportData,
  buildSymbolsExportDataFromSnapshot,
} from '../../../../src/extension/export/symbols/build';

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
        totalNodes: 2,
        totalSymbols: 2,
        totalRelations: 1,
      },
      files: [
        { filePath: 'src/app.ts', nodeCount: 1, symbolCount: 1, relationCount: 1 },
        { filePath: 'src/lib.ts', nodeCount: 1, symbolCount: 1, relationCount: 1 },
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
            nodes: [
              { id: 'node:file:src/app.ts', nodeType: 'file', label: 'app.ts', filePath: 'src/app.ts' },
            ],
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
      totalNodes: 2,
      totalSymbols: 2,
      totalRelations: 1,
    });
    expect(exportData.files).toEqual([
      { filePath: 'src/app.ts', nodeCount: 1, symbolCount: 1, relationCount: 1 },
      { filePath: 'src/lib.ts', nodeCount: 1, symbolCount: 1, relationCount: 1 },
    ]);
  });

  it('builds the same lightweight export shape from the persisted structured snapshot', () => {
    const exportData = buildSymbolsExportDataFromSnapshot({
      files: [
        {
          filePath: 'src/app.ts',
          mtime: 1,
          analysis: {
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
          },
        },
        {
          filePath: 'src/lib.ts',
          mtime: 2,
          analysis: {
            filePath: 'src/lib.ts',
            symbols: [
              {
                id: 'symbol:src/lib.ts:boot',
                name: 'boot',
                kind: 'function',
                filePath: 'src/lib.ts',
              },
            ],
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

    expect(exportData).toMatchObject({
      format: 'codegraphy-symbol-export',
      version: '1.0',
      summary: {
        totalFiles: 2,
        totalNodes: 2,
        totalSymbols: 2,
        totalRelations: 1,
      },
      files: [
        { filePath: 'src/app.ts', nodeCount: 1, symbolCount: 1, relationCount: 1 },
        { filePath: 'src/lib.ts', nodeCount: 1, symbolCount: 1, relationCount: 1 },
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

  it('synthesizes file nodes for snapshot files when analysis nodes are absent', () => {
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
        },
      ],
      relations: [],
    });

    expect(exportData.summary).toEqual({
      totalFiles: 2,
      totalNodes: 2,
      totalSymbols: 1,
      totalRelations: 0,
    });
    expect(exportData.files).toEqual([
      { filePath: 'src/app.ts', nodeCount: 1, symbolCount: 1, relationCount: 0 },
      { filePath: 'src/lib.ts', nodeCount: 1, symbolCount: 0, relationCount: 0 },
    ]);
    expect(exportData.nodes).toEqual([
      {
        id: 'node:file:src/app.ts',
        nodeType: 'file',
        label: 'app.ts',
        filePath: 'src/app.ts',
      },
      {
        id: 'node:file:src/lib.ts',
        nodeType: 'file',
        label: 'lib.ts',
        filePath: 'src/lib.ts',
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
      symbols: [],
      relations: [
        {
          kind: 'import',
          sourceId: 'core:treesitter',
          fromFilePath: 'src/app.ts',
          toFilePath: 'src/createFolder.ts',
        },
      ],
    });

    expect(exportData.files).toEqual([
      { filePath: 'src/createFolder.ts', nodeCount: 1, symbolCount: 0, relationCount: 1 },
      { filePath: 'src/app.ts', nodeCount: 1, symbolCount: 0, relationCount: 1 },
    ]);
  });
});
