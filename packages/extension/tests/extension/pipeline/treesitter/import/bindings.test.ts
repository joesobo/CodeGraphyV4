import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Parser from 'tree-sitter';
import { collectImportBindings } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/bindings';
import { applyImportClauseBinding } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/clause';

vi.mock('../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/clause', () => ({
  applyImportClauseBinding: vi.fn(),
}));

function createNode({
  type = 'statement',
  namedChildren = [],
}: {
  type?: string;
  namedChildren?: Parser.SyntaxNode[];
} = {}): Parser.SyntaxNode {
  return {
    type,
    namedChildren,
  } as unknown as Parser.SyntaxNode;
}

describe('pipeline/plugins/treesitter/runtime/analyzeImportBinding/bindings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns early when the statement has no import clause child', () => {
    const importedBindings = new Map();

    collectImportBindings(
      createNode({
        namedChildren: [createNode({ type: 'string' })],
      }),
      'react',
      '/workspace/node_modules/react/index.js',
      importedBindings,
    );

    expect(applyImportClauseBinding).not.toHaveBeenCalled();
  });

  it('delegates each import clause child in order with the provided binding context', () => {
    const importedBindings = new Map();
    const defaultImport = createNode({ type: 'identifier' });
    const namedImports = createNode({ type: 'named_imports' });

    collectImportBindings(
      createNode({
        namedChildren: [
          createNode({ type: 'comment' }),
          createNode({
            type: 'import_clause',
            namedChildren: [defaultImport, namedImports],
          }),
        ],
      }),
      './lib',
      '/workspace/src/lib.ts',
      importedBindings,
    );

    expect(applyImportClauseBinding).toHaveBeenCalledTimes(2);
    expect(applyImportClauseBinding).toHaveBeenNthCalledWith(
      1,
      defaultImport,
      importedBindings,
      './lib',
      '/workspace/src/lib.ts',
    );
    expect(applyImportClauseBinding).toHaveBeenNthCalledWith(
      2,
      namedImports,
      importedBindings,
      './lib',
      '/workspace/src/lib.ts',
    );
  });
});
