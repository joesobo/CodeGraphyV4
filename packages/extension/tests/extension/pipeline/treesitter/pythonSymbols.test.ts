import { describe, expect, it, vi } from 'vitest';
import type Parser from 'tree-sitter';
import type {
  IAnalysisRelation,
  IAnalysisSymbol,
} from '../../../../src/core/plugins/types/contracts';
import {
  handlePythonCall,
  handlePythonClassDefinition,
  handlePythonFunctionDefinition,
} from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/python/symbols';
import type { ImportedBinding, SymbolWalkState } from '../../../../src/extension/pipeline/plugins/treesitter/runtime/analyze/model';

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

describe('pipeline/plugins/treesitter/runtime/analyze/python/symbols', () => {
  it('adds class symbols only when the class definition has a name', () => {
    const symbols: IAnalysisSymbol[] = [];
    const namedClass = createNode({
      type: 'class_definition',
      fields: {
        name: createNode({ type: 'identifier', text: 'Service' }),
      },
    });
    const unnamedClass = createNode({ type: 'class_definition' });

    handlePythonClassDefinition(namedClass, '/workspace/app.py', symbols);
    handlePythonClassDefinition(unnamedClass, '/workspace/app.py', symbols);

    expect(symbols).toEqual([
      expect.objectContaining({
        id: '/workspace/app.py:class:Service',
        filePath: '/workspace/app.py',
        kind: 'class',
        name: 'Service',
      }),
    ]);
  });

  it('creates function and method symbols and walks only the symbol body', () => {
    const symbols: IAnalysisSymbol[] = [];
    const walk = vi.fn();
    const body = createNode({ type: 'block', text: 'body' });
    const classParent = createNode({ type: 'class_definition', text: 'class Service' });
    const classBlock = createNode({ type: 'block', parent: classParent });
    const methodNode = createNode({
      type: 'function_definition',
      fields: {
        name: createNode({ type: 'identifier', text: 'start' }),
        body,
      },
      parent: classBlock,
    });
    const functionNode = createNode({
      type: 'function_definition',
      fields: {
        name: createNode({ type: 'identifier', text: 'run' }),
        body,
      },
    });

    const methodAction = handlePythonFunctionDefinition(
      methodNode,
      '/workspace/app.py',
      symbols,
      walk as (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
    );
    const functionAction = handlePythonFunctionDefinition(
      functionNode,
      '/workspace/app.py',
      symbols,
      walk as (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
    );
    const unnamedAction = handlePythonFunctionDefinition(
      createNode({ type: 'function_definition' }),
      '/workspace/app.py',
      symbols,
      walk as (node: Parser.SyntaxNode, context: SymbolWalkState) => void,
    );

    expect(symbols).toEqual([
      expect.objectContaining({
        id: '/workspace/app.py:method:start',
        kind: 'method',
        name: 'start',
      }),
      expect.objectContaining({
        id: '/workspace/app.py:function:run',
        kind: 'function',
        name: 'run',
      }),
    ]);
    expect(methodAction).toEqual({ skipChildren: true });
    expect(functionAction).toEqual({ skipChildren: true });
    expect(unnamedAction).toBeUndefined();
    expect(walk).toHaveBeenNthCalledWith(1, body, { currentSymbolId: '/workspace/app.py:method:start' });
    expect(walk).toHaveBeenNthCalledWith(2, body, { currentSymbolId: '/workspace/app.py:function:run' });
  });

  it('adds call relations for identifier and attribute-based imported bindings only', () => {
    const relations: IAnalysisRelation[] = [];
    const importedBindings = new Map<string, ImportedBinding>([
      ['boot', { specifier: './boot', resolvedPath: '/workspace/boot.py' }],
      ['service', { specifier: './service', resolvedPath: '/workspace/service.py' }],
    ]);
    const identifierCall = createNode({
      type: 'call',
      fields: {
        function: createNode({ type: 'identifier', text: 'boot' }),
      },
    });
    const attributeCall = createNode({
      type: 'call',
      fields: {
        function: createNode({
          type: 'attribute',
          fields: {
            object: createNode({ type: 'identifier', text: 'service' }),
          },
        }),
      },
    });
    const fallbackCall = createNode({
      type: 'call',
      namedChildren: [
        createNode({ type: 'attribute', fields: { object: createNode({ type: 'identifier', text: 'service' }) } }),
      ],
    });
    const unknownCall = createNode({
      type: 'call',
      fields: {
        function: createNode({ type: 'identifier', text: 'missing' }),
      },
    });

    handlePythonCall(identifierCall, '/workspace/app.py', relations, importedBindings, '/workspace/app.py:function:run');
    handlePythonCall(attributeCall, '/workspace/app.py', relations, importedBindings);
    handlePythonCall(fallbackCall, '/workspace/app.py', relations, importedBindings);
    handlePythonCall(unknownCall, '/workspace/app.py', relations, importedBindings);

    expect(relations).toEqual([
      expect.objectContaining({
        kind: 'call',
        fromFilePath: '/workspace/app.py',
        fromSymbolId: '/workspace/app.py:function:run',
        specifier: './boot',
        resolvedPath: '/workspace/boot.py',
        toFilePath: '/workspace/boot.py',
      }),
      expect.objectContaining({
        kind: 'call',
        fromFilePath: '/workspace/app.py',
        fromSymbolId: undefined,
        specifier: './service',
        resolvedPath: '/workspace/service.py',
        toFilePath: '/workspace/service.py',
      }),
      expect.objectContaining({
        kind: 'call',
        fromFilePath: '/workspace/app.py',
        specifier: './service',
        resolvedPath: '/workspace/service.py',
      }),
    ]);
  });
});
