import { describe, expect, it } from 'vitest';
import type Parser from 'tree-sitter';
import { getVariableAssignedFunctionSymbol } from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeImportBinding/functionSymbols';

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
  return {
    type,
    text,
    namedChildren,
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: text.length },
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
  } as unknown as Parser.SyntaxNode;
}

describe('pipeline/plugins/treesitter/runtime/analyzeImportBinding/functionSymbols', () => {
  it('returns null when the node is not a variable declarator or is missing a usable function assignment', () => {
    expect(
      getVariableAssignedFunctionSymbol(
        createNode({ type: 'assignment_expression' }),
        '/workspace/app.ts',
      ),
    ).toBeNull();

    expect(
      getVariableAssignedFunctionSymbol(
        createNode({
          type: 'variable_declarator',
          fields: {
            name: createNode({ type: 'identifier', text: 'run' }),
            value: createNode({ type: 'number', text: '1' }),
          },
        }),
        '/workspace/app.ts',
      ),
    ).toBeNull();

    expect(
      getVariableAssignedFunctionSymbol(
        createNode({
          type: 'variable_declarator',
          fields: {
            value: createNode({ type: 'arrow_function', text: '() => {}' }),
          },
        }),
        '/workspace/app.ts',
      ),
    ).toBeNull();
  });

  it('creates symbols for arrow functions, function declarations, and function expressions assigned to variables', () => {
    const nameNode = createNode({ type: 'identifier', text: 'runTask' });
    const fallbackNameNode = createNode({ type: 'identifier', text: 'buildTask' });

    expect(
      getVariableAssignedFunctionSymbol(
        createNode({
          type: 'variable_declarator',
          fields: {
            name: nameNode,
            value: createNode({ type: 'arrow_function', text: '() => {}' }),
          },
        }),
        '/workspace/app.ts',
      ),
    ).toEqual(
      expect.objectContaining({
        id: '/workspace/app.ts:function:runTask',
        filePath: '/workspace/app.ts',
        kind: 'function',
        name: 'runTask',
      }),
    );

    expect(
      getVariableAssignedFunctionSymbol(
        createNode({
          type: 'variable_declarator',
          namedChildren: [
            fallbackNameNode,
            createNode({ type: 'function', text: 'function buildTask() {}' }),
          ],
        }),
        '/workspace/app.ts',
      ),
    ).toEqual(
      expect.objectContaining({
        id: '/workspace/app.ts:function:buildTask',
        kind: 'function',
        name: 'buildTask',
      }),
    );

    expect(
      getVariableAssignedFunctionSymbol(
        createNode({
          type: 'variable_declarator',
          fields: {
            name: createNode({ type: 'identifier', text: 'cleanup' }),
            value: createNode({ type: 'function_expression', text: 'function () {}' }),
          },
        }),
        '/workspace/app.ts',
      ),
    ).toEqual(
      expect.objectContaining({
        id: '/workspace/app.ts:function:cleanup',
        kind: 'function',
        name: 'cleanup',
      }),
    );
  });
});
