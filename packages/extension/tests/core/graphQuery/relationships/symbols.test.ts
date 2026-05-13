import { describe, expect, it } from 'vitest';
import type { IAnalysisRelation, IAnalysisSymbol } from '../../../../src/core/plugins/types/contracts';
import {
  createProvenance,
  createRelationshipSymbol,
  createSymbolMap,
} from '../../../../src/core/graphQuery/relationships/symbols';

const symbols: IAnalysisSymbol[] = [
  {
    id: 'src/user.ts#User:type',
    filePath: 'src/user.ts',
    name: 'User',
    kind: 'type',
    signature: 'type User = { id: string }',
    range: { startLine: 2, endLine: 4 },
    metadata: {
      language: 'typescript',
      source: 'codegraphy.treesitter',
      pluginKind: 'type-alias',
    },
  },
  {
    id: 'src/user.ts#createUser:function',
    filePath: 'src/user.ts',
    name: 'createUser',
    kind: 'function',
  },
];

function relation(overrides: Partial<IAnalysisRelation> = {}): IAnalysisRelation {
  return {
    kind: 'import',
    pluginId: 'plugin.routes',
    sourceId: 'route-import',
    fromFilePath: 'src/app.ts',
    toFilePath: 'src/user.ts',
    toSymbolId: 'src/user.ts#User:type',
    ...overrides,
  };
}

describe('core/graphQuery/relationships/symbols', () => {
  it('creates a lookup map keyed by symbol id', () => {
    const symbolById = createSymbolMap(symbols);

    expect(symbolById.get('src/user.ts#User:type')?.name).toBe('User');
    expect(symbolById.get('src/user.ts#createUser:function')?.kind).toBe('function');
    expect(createSymbolMap(undefined).size).toBe(0);
  });

  it('creates relationship symbols with metadata and omits type-import kinds', () => {
    const symbolById = createSymbolMap(symbols);

    expect(createRelationshipSymbol('import', relation(), symbolById)).toEqual({
      id: 'src/user.ts#User:type',
      filePath: 'src/user.ts',
      name: 'User',
      kind: 'type',
      signature: 'type User = { id: string }',
      range: { startLine: 2, endLine: 4 },
      language: 'typescript',
      source: 'codegraphy.treesitter',
      pluginKind: 'type-alias',
    });
    expect(createRelationshipSymbol('type-import', relation(), symbolById)).toEqual({
      id: 'src/user.ts#User:type',
      filePath: 'src/user.ts',
      name: 'User',
      signature: 'type User = { id: string }',
      range: { startLine: 2, endLine: 4 },
      language: 'typescript',
      source: 'codegraphy.treesitter',
      pluginKind: 'type-alias',
    });
  });

  it('uses source symbols when no target symbol exists and skips missing ids', () => {
    const symbolById = createSymbolMap(symbols);

    expect(createRelationshipSymbol('reference', relation({
      fromSymbolId: 'src/user.ts#createUser:function',
      toSymbolId: undefined,
    }), symbolById)).toEqual({
      id: 'src/user.ts#createUser:function',
      filePath: 'src/user.ts',
      name: 'createUser',
      kind: 'function',
    });
    expect(createRelationshipSymbol('reference', relation({ toSymbolId: 'missing' }), symbolById)).toBeUndefined();
    expect(createRelationshipSymbol('reference', relation({ toSymbolId: undefined }), symbolById)).toBeUndefined();
    expect(createRelationshipSymbol('reference', relation({ toSymbolId: undefined }), new Map([
      [undefined as unknown as string, symbols[0]],
    ]))).toBeUndefined();
  });

  it('omits blank symbol kinds from relationship symbols', () => {
    expect(createRelationshipSymbol('reference', relation({
      toSymbolId: 'src/user.ts#anonymous',
    }), createSymbolMap([
      {
        id: 'src/user.ts#anonymous',
        filePath: 'src/user.ts',
        name: 'anonymous',
        kind: '',
      },
    ]))).toEqual({
      id: 'src/user.ts#anonymous',
      filePath: 'src/user.ts',
      name: 'anonymous',
    });
  });

  it('keeps plugin provenance while hiding core tree-sitter provenance', () => {
    expect(createProvenance(relation())).toEqual({
      pluginId: 'plugin.routes',
      sourceId: 'route-import',
    });
    expect(createProvenance(relation({ pluginId: 'codegraphy.treesitter' }))).toBeUndefined();
    expect(createProvenance(relation({ pluginId: undefined }))).toBeUndefined();
  });
});
