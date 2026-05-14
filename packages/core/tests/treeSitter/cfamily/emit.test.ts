import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '@codegraphy/plugin-api';
import {
  addCxxTypeSymbol,
  addFunctionSymbol,
  addNamedSymbol,
  addTypeAliasSymbol,
} from '../../../src/treeSitter/runtime/analyzeCFamily/emit';

function createNode({
  type,
  text = type,
  fields = {},
  namedChildren = [],
}: {
  type: string;
  text?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
  namedChildren?: Parser.SyntaxNode[];
}): Parser.SyntaxNode {
  const node = {
    type,
    text,
    namedChildren,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
  } as unknown as Parser.SyntaxNode;

  for (const child of namedChildren) {
    (child as { parent?: Parser.SyntaxNode }).parent ??= node;
  }

  return node;
}

function createFunctionDeclarator(name: string): Parser.SyntaxNode {
  return createNode({
    type: 'function_declarator',
    text: `${name}()`,
    namedChildren: [createNode({ type: 'identifier', text: name })],
  });
}

describe('pipeline/plugins/treesitter/runtime/analyzeCFamily/emit', () => {
  it('adds named symbols only when a name node is available', () => {
    const symbols: IAnalysisSymbol[] = [];
    const node = createNode({ type: 'class_specifier', text: 'class Runner' });

    addNamedSymbol(symbols, '/workspace/app.cpp', 'class', createNode({ type: 'identifier', text: 'Runner' }), node);
    addNamedSymbol(symbols, '/workspace/app.cpp', 'class', null, node);

    expect(symbols).toEqual([
      expect.objectContaining({
        id: '/workspace/app.cpp:class:Runner',
        filePath: '/workspace/app.cpp',
        kind: 'class',
        name: 'Runner',
      }),
    ]);
  });

  it('adds function symbols and skips their child nodes', () => {
    const symbols: IAnalysisSymbol[] = [];
    const node = createNode({
      type: 'function_definition',
      fields: {
        declarator: createFunctionDeclarator('boot'),
      },
    });

    const action = addFunctionSymbol(node, '/workspace/app.cpp', symbols, 'function');

    expect(action).toEqual({ skipChildren: true });
    expect(symbols).toEqual([
      expect.objectContaining({
        id: '/workspace/app.cpp:function:boot',
        kind: 'function',
        name: 'boot',
      }),
    ]);
  });

  it('adds C++ class, struct, and union symbols', () => {
    const symbols: IAnalysisSymbol[] = [];

    addCxxTypeSymbol(
      createNode({
        type: 'class_specifier',
        fields: {
          name: createNode({ type: 'type_identifier', text: 'Runner' }),
        },
      }),
      '/workspace/types.cpp',
      symbols,
    );
    addCxxTypeSymbol(
      createNode({
        type: 'struct_specifier',
        fields: {
          name: createNode({ type: 'type_identifier', text: 'Counter' }),
        },
      }),
      '/workspace/types.cpp',
      symbols,
    );
    addCxxTypeSymbol(
      createNode({
        type: 'union_specifier',
        fields: {
          name: createNode({ type: 'type_identifier', text: 'Payload' }),
        },
      }),
      '/workspace/types.cpp',
      symbols,
    );

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'class', name: 'Runner' }),
      expect.objectContaining({ kind: 'struct', name: 'Counter' }),
      expect.objectContaining({ kind: 'union', name: 'Payload' }),
    ]);
  });

  it('adds type aliases from declarator fields and type-identifier fallback children', () => {
    const symbols: IAnalysisSymbol[] = [];

    addTypeAliasSymbol(
      createNode({
        type: 'type_definition',
        fields: {
          declarator: createNode({ type: 'type_identifier', text: 'RunnerId' }),
        },
      }),
      '/workspace/types.cpp',
      symbols,
    );
    addTypeAliasSymbol(
      createNode({
        type: 'type_definition',
        namedChildren: [createNode({ type: 'type_identifier', text: 'CounterId' })],
      }),
      '/workspace/types.cpp',
      symbols,
    );

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'type', name: 'RunnerId' }),
      expect.objectContaining({ kind: 'type', name: 'CounterId' }),
    ]);
  });
});
