import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '../../../../../src/core/plugins/types/contracts';
import { C_FAMILY_SYMBOL_HANDLERS } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeCFamily/handlers';

function createNode({
  type,
  text = type,
  fields = {},
  namedChildren = [],
  parent,
}: {
  type: string;
  text?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
  namedChildren?: Parser.SyntaxNode[];
  parent?: Parser.SyntaxNode;
}): Parser.SyntaxNode {
  const node = {
    type,
    text,
    parent,
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
    namedChildren: [
      createNode({ type: 'identifier', text: name }),
    ],
  });
}

function runHandler(
  type: string,
  node: Parser.SyntaxNode,
  symbols: IAnalysisSymbol[],
) {
  return C_FAMILY_SYMBOL_HANDLERS[type]?.({
    filePath: '/workspace/src/app.cpp',
    node,
    symbols,
  });
}

describe('pipeline/plugins/treesitter/runtime/analyzeCFamily/handlers', () => {
  it('routes callable declarations to function and method symbol emitters', () => {
    const symbols: IAnalysisSymbol[] = [];
    const classParent = createNode({ type: 'class_specifier', text: 'class Runner' });

    const functionAction = runHandler(
      'function_definition',
      createNode({
        type: 'function_definition',
        fields: {
          declarator: createFunctionDeclarator('boot'),
        },
      }),
      symbols,
    );
    const methodAction = runHandler(
      'function_definition',
      createNode({
        type: 'function_definition',
        fields: {
          declarator: createFunctionDeclarator('run'),
        },
        parent: classParent,
      }),
      symbols,
    );
    const declarationAction = runHandler(
      'declaration',
      createNode({
        type: 'declaration',
        namedChildren: [createFunctionDeclarator('helper')],
      }),
      symbols,
    );
    const fieldAction = runHandler(
      'field_declaration',
      createNode({
        type: 'field_declaration',
        namedChildren: [createFunctionDeclarator('render')],
      }),
      symbols,
    );

    expect(functionAction).toEqual({ skipChildren: true });
    expect(methodAction).toEqual({ skipChildren: true });
    expect(declarationAction).toEqual({ skipChildren: true });
    expect(fieldAction).toEqual({ skipChildren: true });
    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'function', name: 'boot' }),
      expect.objectContaining({ kind: 'method', name: 'run' }),
      expect.objectContaining({ kind: 'function', name: 'helper' }),
      expect.objectContaining({ kind: 'method', name: 'render' }),
    ]);
  });

  it('routes type declarations to type, enum, and namespace symbol emitters', () => {
    const symbols: IAnalysisSymbol[] = [];

    runHandler(
      'class_specifier',
      createNode({
        type: 'class_specifier',
        fields: {
          name: createNode({ type: 'type_identifier', text: 'Runner' }),
        },
      }),
      symbols,
    );
    runHandler(
      'struct_specifier',
      createNode({
        type: 'struct_specifier',
        namedChildren: [createNode({ type: 'type_identifier', text: 'Counter' })],
      }),
      symbols,
    );
    runHandler(
      'union_specifier',
      createNode({
        type: 'union_specifier',
        fields: {
          name: createNode({ type: 'type_identifier', text: 'Payload' }),
        },
      }),
      symbols,
    );
    const enumAction = runHandler(
      'enum_specifier',
      createNode({
        type: 'enum_specifier',
        fields: {
          name: createNode({ type: 'type_identifier', text: 'Mode' }),
        },
      }),
      symbols,
    );
    runHandler(
      'namespace_definition',
      createNode({
        type: 'namespace_definition',
        fields: {
          name: createNode({ type: 'namespace_identifier', text: 'feature' }),
        },
      }),
      symbols,
    );
    runHandler(
      'type_definition',
      createNode({
        type: 'type_definition',
        fields: {
          declarator: createNode({ type: 'type_identifier', text: 'RunnerId' }),
        },
      }),
      symbols,
    );

    expect(enumAction).toEqual({ skipChildren: true });
    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'class', name: 'Runner' }),
      expect.objectContaining({ kind: 'struct', name: 'Counter' }),
      expect.objectContaining({ kind: 'union', name: 'Payload' }),
      expect.objectContaining({ kind: 'enum', name: 'Mode' }),
      expect.objectContaining({ kind: 'namespace', name: 'feature' }),
      expect.objectContaining({ kind: 'type', name: 'RunnerId' }),
    ]);
  });

  it('leaves non-callable declarations alone', () => {
    const symbols: IAnalysisSymbol[] = [];

    expect(
      runHandler(
        'declaration',
        createNode({
          type: 'declaration',
          namedChildren: [createNode({ type: 'primitive_type', text: 'int' })],
        }),
        symbols,
      ),
    ).toBeUndefined();
    expect(
      runHandler(
        'field_declaration',
        createNode({
          type: 'field_declaration',
          namedChildren: [createNode({ type: 'primitive_type', text: 'int' })],
        }),
        symbols,
      ),
    ).toBeUndefined();
    expect(symbols).toEqual([]);
  });
});
