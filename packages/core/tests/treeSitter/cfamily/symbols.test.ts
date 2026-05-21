import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { handleCFamilySymbol } from '../../../src/treeSitter/runtime/analyzeCFamily/symbols';

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

describe('pipeline/plugins/treesitter/runtime/analyzeCFamily/symbols', () => {
  it('adds function and method symbols from C-family callable declarations', () => {
    const symbols: IAnalysisSymbol[] = [];
    const filePath = '/workspace/src/app.cpp';
    const functionDefinition = createNode({
      type: 'function_definition',
      fields: {
        declarator: createFunctionDeclarator('boot'),
      },
    });
    const classParent = createNode({ type: 'class_specifier', text: 'class Runner' });
    const methodDefinition = createNode({
      type: 'function_definition',
      fields: {
        declarator: createFunctionDeclarator('run'),
      },
      parent: classParent,
    });
    const declaration = createNode({
      type: 'declaration',
      namedChildren: [createFunctionDeclarator('helper')],
    });
    const fieldDeclaration = createNode({
      type: 'field_declaration',
      namedChildren: [createFunctionDeclarator('render')],
    });

    const functionAction = handleCFamilySymbol(functionDefinition, filePath, symbols);
    const methodAction = handleCFamilySymbol(methodDefinition, filePath, symbols);
    const declarationAction = handleCFamilySymbol(declaration, filePath, symbols);
    const fieldAction = handleCFamilySymbol(fieldDeclaration, filePath, symbols);

    expect(functionAction).toEqual({ skipChildren: true });
    expect(methodAction).toEqual({ skipChildren: true });
    expect(declarationAction).toEqual({ skipChildren: true });
    expect(fieldAction).toEqual({ skipChildren: true });
    expect(symbols).toEqual([
      expect.objectContaining({ id: `${filePath}:function:boot`, kind: 'function', name: 'boot' }),
      expect.objectContaining({ id: `${filePath}:method:run`, kind: 'method', name: 'run' }),
      expect.objectContaining({ id: `${filePath}:function:helper`, kind: 'function', name: 'helper' }),
      expect.objectContaining({ id: `${filePath}:method:render`, kind: 'method', name: 'render' }),
    ]);
  });

  it('adds type, enum, and namespace symbols from C-family type declarations', () => {
    const symbols: IAnalysisSymbol[] = [];
    const filePath = '/workspace/src/types.cpp';
    const classNode = createNode({
      type: 'class_specifier',
      fields: {
        name: createNode({ type: 'type_identifier', text: 'Runner' }),
      },
    });
    const structNode = createNode({
      type: 'struct_specifier',
      namedChildren: [createNode({ type: 'type_identifier', text: 'Counter' })],
    });
    const unionNode = createNode({
      type: 'union_specifier',
      fields: {
        name: createNode({ type: 'type_identifier', text: 'Payload' }),
      },
    });
    const enumNode = createNode({
      type: 'enum_specifier',
      fields: {
        name: createNode({ type: 'type_identifier', text: 'Mode' }),
      },
    });
    const namespaceNode = createNode({
      type: 'namespace_definition',
      fields: {
        name: createNode({ type: 'namespace_identifier', text: 'feature' }),
      },
    });
    const aliasNode = createNode({
      type: 'type_definition',
      fields: {
        declarator: createNode({ type: 'type_identifier', text: 'RunnerId' }),
      },
    });
    const fallbackAliasNode = createNode({
      type: 'type_definition',
      namedChildren: [createNode({ type: 'type_identifier', text: 'CounterId' })],
    });

    handleCFamilySymbol(classNode, filePath, symbols);
    handleCFamilySymbol(structNode, filePath, symbols);
    handleCFamilySymbol(unionNode, filePath, symbols);
    const enumAction = handleCFamilySymbol(enumNode, filePath, symbols);
    handleCFamilySymbol(namespaceNode, filePath, symbols);
    handleCFamilySymbol(aliasNode, filePath, symbols);
    handleCFamilySymbol(fallbackAliasNode, filePath, symbols);

    expect(enumAction).toEqual({ skipChildren: true });
    expect(symbols).toEqual([
      expect.objectContaining({ id: `${filePath}:class:Runner`, kind: 'class', name: 'Runner' }),
      expect.objectContaining({ id: `${filePath}:struct:Counter`, kind: 'struct', name: 'Counter' }),
      expect.objectContaining({ id: `${filePath}:union:Payload`, kind: 'union', name: 'Payload' }),
      expect.objectContaining({ id: `${filePath}:enum:Mode`, kind: 'enum', name: 'Mode' }),
      expect.objectContaining({ id: `${filePath}:namespace:feature`, kind: 'namespace', name: 'feature' }),
      expect.objectContaining({ id: `${filePath}:type:RunnerId`, kind: 'type', name: 'RunnerId' }),
      expect.objectContaining({ id: `${filePath}:type:CounterId`, kind: 'type', name: 'CounterId' }),
    ]);
  });

  it('ignores unsupported nodes and declarations without names', () => {
    const symbols: IAnalysisSymbol[] = [];
    const filePath = '/workspace/src/empty.c';
    const plainDeclaration = createNode({
      type: 'declaration',
      namedChildren: [createNode({ type: 'primitive_type', text: 'int' })],
    });
    const plainFieldDeclaration = createNode({
      type: 'field_declaration',
      namedChildren: [createNode({ type: 'primitive_type', text: 'int' })],
    });

    expect(handleCFamilySymbol(createNode({ type: 'comment' }), filePath, symbols)).toBeUndefined();
    expect(handleCFamilySymbol(plainDeclaration, filePath, symbols)).toBeUndefined();
    expect(handleCFamilySymbol(plainFieldDeclaration, filePath, symbols)).toBeUndefined();
    handleCFamilySymbol(createNode({ type: 'class_specifier' }), filePath, symbols);

    expect(symbols).toEqual([]);
  });
});
