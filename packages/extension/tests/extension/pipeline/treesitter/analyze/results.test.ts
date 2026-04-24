import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import { TREE_SITTER_SOURCE_IDS } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/languages';
import {
  addCallRelation,
  addImportRelation,
  addInheritRelation,
  addReferenceRelation,
  addTypeImportRelation,
  createRange,
  createSymbol,
  createSymbolId,
  normalizeAnalysisResult,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/results';

function createNode(
  startRow: number,
  startColumn: number,
  endRow: number,
  endColumn: number,
): Parser.SyntaxNode {
  return {
    startPosition: { row: startRow, column: startColumn },
    endPosition: { row: endRow, column: endColumn },
  } as Parser.SyntaxNode;
}

describe('pipeline/plugins/treesitter/runtime/analyze/results', () => {
  it('builds 1-based ranges from parser coordinates', () => {
    expect(createRange(createNode(2, 3, 5, 7))).toEqual({
      startLine: 3,
      startColumn: 4,
      endLine: 6,
      endColumn: 8,
    });
  });

  it('builds symbol ids with and without a signature suffix', () => {
    expect(createSymbolId('/workspace/app.ts', 'function', 'run')).toBe(
      '/workspace/app.ts:function:run',
    );
    expect(createSymbolId('/workspace/app.ts', 'function', 'run', '(): void')).toBe(
      '/workspace/app.ts:function:run:(): void',
    );
  });

  it('creates symbols with ids, ranges, and optional signatures', () => {
    expect(
      createSymbol(
        '/workspace/app.ts',
        'function',
        'run',
        createNode(0, 1, 2, 3),
        '(): void',
      ),
    ).toEqual({
      id: '/workspace/app.ts:function:run:(): void',
      filePath: '/workspace/app.ts',
      kind: 'function',
      name: 'run',
      range: {
        startLine: 1,
        startColumn: 2,
        endLine: 3,
        endColumn: 4,
      },
      signature: '(): void',
    });
  });

  it('normalizes relations with the Tree-sitter plugin id without mutating inputs', () => {
    const relation = {
      kind: 'import',
      sourceId: 'source-id',
      fromFilePath: '/workspace/app.ts',
      specifier: './dep',
      resolvedPath: '/workspace/dep.ts',
      toFilePath: '/workspace/dep.ts',
    };
    const symbols = [{ id: 'symbol-id' }];

    const result = normalizeAnalysisResult(
      '/workspace/app.ts',
      symbols as never,
      [relation] as never,
    );

    expect(result).toEqual({
      filePath: '/workspace/app.ts',
      symbols,
      relations: [
        {
          ...relation,
          pluginId: 'codegraphy.treesitter',
        },
      ],
    });
    expect(result.relations).toBeDefined();
    expect(result.relations?.[0]).not.toBe(relation);
    expect(relation).not.toHaveProperty('pluginId');
    expect(result.symbols).toBe(symbols);
  });

  it('adds import relations with defaults and explicit overrides', () => {
    const relations: unknown[] = [];

    addImportRelation(relations as never, '/workspace/app.ts', './dep', '/workspace/dep.ts');
    addImportRelation(
      relations as never,
      '/workspace/app.ts',
      './styles.css',
      null,
      'style',
      TREE_SITTER_SOURCE_IDS.dynamicImport,
    );

    expect(relations).toEqual([
      {
        kind: 'import',
        sourceId: TREE_SITTER_SOURCE_IDS.import,
        fromFilePath: '/workspace/app.ts',
        specifier: './dep',
        resolvedPath: '/workspace/dep.ts',
        toFilePath: '/workspace/dep.ts',
        type: undefined,
      },
      {
        kind: 'import',
        sourceId: TREE_SITTER_SOURCE_IDS.dynamicImport,
        fromFilePath: '/workspace/app.ts',
        specifier: './styles.css',
        resolvedPath: null,
        toFilePath: null,
        type: 'style',
      },
    ]);
  });

  it('adds type-import relations with their own edge kind and source id', () => {
    const relations: unknown[] = [];

    addTypeImportRelation(relations as never, '/workspace/app.ts', './types', '/workspace/types.ts');

    expect(relations).toEqual([
      {
        kind: 'type-import',
        sourceId: TREE_SITTER_SOURCE_IDS.typeImport,
        fromFilePath: '/workspace/app.ts',
        specifier: './types',
        resolvedPath: '/workspace/types.ts',
        toFilePath: '/workspace/types.ts',
      },
    ]);
  });

  it('adds call, inherit, and reference relations with the expected fields', () => {
    const relations: unknown[] = [];

    addCallRelation(
      relations as never,
      '/workspace/app.ts',
      { specifier: 'run', resolvedPath: '/workspace/dep.ts' },
      'function-id',
    );
    addInheritRelation(relations as never, '/workspace/app.ts', 'BaseType');
    addReferenceRelation(
      relations as never,
      '/workspace/app.ts',
      'Config',
      '/workspace/config.ts',
      'reference-id',
    );

    expect(relations).toEqual([
      {
        kind: 'call',
        sourceId: TREE_SITTER_SOURCE_IDS.call,
        fromFilePath: '/workspace/app.ts',
        fromSymbolId: 'function-id',
        specifier: 'run',
        resolvedPath: '/workspace/dep.ts',
        toFilePath: '/workspace/dep.ts',
        metadata: {
          bindingKind: null,
          importedName: null,
          localName: null,
          memberName: null,
        },
      },
      {
        kind: 'inherit',
        sourceId: TREE_SITTER_SOURCE_IDS.inherit,
        fromFilePath: '/workspace/app.ts',
        specifier: 'BaseType',
        resolvedPath: null,
        toFilePath: null,
      },
      {
        kind: 'reference',
        sourceId: TREE_SITTER_SOURCE_IDS.reference,
        fromFilePath: '/workspace/app.ts',
        fromSymbolId: 'reference-id',
        specifier: 'Config',
        resolvedPath: '/workspace/config.ts',
        toFilePath: '/workspace/config.ts',
      },
    ]);
  });
});
