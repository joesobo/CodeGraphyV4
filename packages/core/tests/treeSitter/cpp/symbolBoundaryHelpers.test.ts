import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import { getDeclaratorNameNodes } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/declarator/candidates';
import { getDeclaratorNameNode } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/declarator/nameNode';
import { findLastDeclaratorNameNode } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/declarator/search';
import { handleCppFieldDeclaration } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/variable/field';
import { handleCppForRangeLoop } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/variable/loop';
import {
  handleCppTemplateDeclaration,
  handleCppTypeDeclaration,
} from '../../../src/treeSitter/runtime/analyzeCpp/symbol/type/declaration';
import { getTemplateDeclarationNameNode } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/type/templates';

function createNode({
  type,
  text = type,
  fields = {},
  namedChildren = [],
  parent,
  startRow = 0,
  startColumn = 0,
}: {
  type: string;
  text?: string;
  fields?: Record<string, Parser.SyntaxNode | null | undefined>;
  namedChildren?: Parser.SyntaxNode[];
  parent?: Parser.SyntaxNode;
  startRow?: number;
  startColumn?: number;
}): Parser.SyntaxNode {
  const node = {
    type,
    text,
    parent,
    namedChildren,
    startPosition: { row: startRow, column: startColumn },
    endPosition: { row: startRow, column: startColumn + text.length },
    childForFieldName(name: string) {
      return fields[name] ?? null;
    },
  } as unknown as Parser.SyntaxNode;

  for (const child of namedChildren) {
    (child as { parent?: Parser.SyntaxNode }).parent ??= node;
  }
  for (const child of Object.values(fields)) {
    if (child) {
      (child as { parent?: Parser.SyntaxNode }).parent ??= node;
    }
  }

  return node;
}

function identifier(text: string): Parser.SyntaxNode {
  return createNode({ type: 'identifier', text });
}

function fieldIdentifier(text: string): Parser.SyntaxNode {
  return createNode({ type: 'field_identifier', text });
}

function typeIdentifier(text: string): Parser.SyntaxNode {
  return createNode({ type: 'type_identifier', text });
}

function functionDeclarator(name: Parser.SyntaxNode, extraChildren: Parser.SyntaxNode[] = []): Parser.SyntaxNode {
  return createNode({
    type: 'function_declarator',
    text: `${name.text}()`,
    fields: { declarator: name },
    namedChildren: [name, ...extraChildren],
  });
}

describe('pipeline/plugins/treesitter/runtime/analyzeCpp symbol boundary helpers', () => {
  it('keeps ignored and missing declarator names out of candidate lists', () => {
    const destructorName = createNode({
      type: 'destructor_name',
      text: '~Worker',
      fields: { declarator: identifier('Worker') },
      namedChildren: [identifier('Worker')],
    });
    const selectedPointer = createNode({
      type: 'pointer_declarator',
      fields: { declarator: identifier('selected') },
    });
    const declaration = createNode({
      type: 'declaration',
      namedChildren: [
        identifier('bare'),
        functionDeclarator(destructorName),
        createNode({ type: 'array_declarator' }),
        selectedPointer,
      ],
    });

    expect(getDeclaratorNameNode(destructorName)).toBeNull();
    expect(getDeclaratorNameNodes(declaration)).toEqual([selectedPointer.childForFieldName('declarator')]);
    expect(findLastDeclaratorNameNode([
      fieldIdentifier('first'),
      createNode({ type: 'comment' }),
    ], getDeclaratorNameNode)?.text).toBe('first');
  });

  it('accepts exact pure virtual declarations without accepting suffix text', () => {
    const filePath = '/workspace/src/worker.hpp';
    const symbols: IAnalysisSymbol[] = [];

    for (const fieldDeclaration of [
      createNode({
        type: 'field_declaration',
        text: 'virtual void compact()=0;',
        namedChildren: [functionDeclarator(identifier('compact'))],
      }),
      createNode({
        type: 'field_declaration',
        text: 'virtual void trimmed() = 0\n',
        namedChildren: [functionDeclarator(identifier('trimmed'))],
      }),
      createNode({
        type: 'field_declaration',
        text: 'virtual void invalid() = 0extra;',
        namedChildren: [functionDeclarator(identifier('invalid'))],
      }),
    ]) {
      expect(handleCppFieldDeclaration(fieldDeclaration, filePath, symbols, {
        currentClassName: 'Worker',
      })).toEqual({ skipChildren: true });
    }

    expect(symbols.map((symbol) => symbol.name)).toEqual([
      'Worker::compact',
      'Worker::trimmed',
    ]);
  });

  it('chooses only valid range loop declarators inside functions', () => {
    const filePath = '/workspace/src/runner.cpp';
    const symbols: IAnalysisSymbol[] = [];
    const loopWithNoise = createNode({
      type: 'for_range_loop',
      namedChildren: [
        createNode({ type: 'compound_statement', namedChildren: [identifier('bodyName')] }),
        createNode({ type: 'reference_declarator', fields: { declarator: identifier('') } }),
        createNode({ type: 'pointer_declarator', fields: { declarator: identifier('taskPtr') } }),
      ],
    });
    const bareIdentifierLoop = createNode({
      type: 'for_range_loop',
      namedChildren: [identifier('task')],
    });

    handleCppForRangeLoop(loopWithNoise, filePath, symbols, {
      currentFunctionSymbolId: `${filePath}:function:run`,
    });
    handleCppForRangeLoop(bareIdentifierLoop, filePath, symbols, {
      currentFunctionSymbolId: `${filePath}:function:run`,
    });

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'local', name: 'taskPtr' }),
      expect.objectContaining({ kind: 'local', name: 'task' }),
    ]);
  });

  it('preserves template target ranges and unnamed type declaration state', () => {
    const filePath = '/workspace/src/types.cpp';
    const symbols: IAnalysisSymbol[] = [];
    const typeName = typeIdentifier('TaskQueue');
    const classDeclaration = createNode({
      type: 'class_specifier',
      fields: { name: typeName },
      namedChildren: [typeName],
      startRow: 7,
      startColumn: 2,
    });
    const templateDeclaration = createNode({
      type: 'template_declaration',
      namedChildren: [
        createNode({ type: 'template_parameter_list', text: '<typename Task>' }),
        classDeclaration,
      ],
      startRow: 2,
      startColumn: 0,
    });
    const classWithMethod = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Worker') },
      namedChildren: [functionDeclarator(identifier('execute'))],
    });

    expect(handleCppTemplateDeclaration(templateDeclaration, filePath, symbols, {})).toEqual({
      nextContext: { suppressTypeDeclarationSymbol: true },
    });
    expect(handleCppTypeDeclaration(createNode({ type: 'struct_specifier' }), filePath, symbols, {
      currentClassName: 'Outer',
    })).toEqual({
      nextContext: { currentClassName: 'Outer', suppressTypeDeclarationSymbol: false },
    });
    expect(getTemplateDeclarationNameNode(classWithMethod)?.text).toBe('Worker');
    expect(symbols).toEqual([
      expect.objectContaining({
        kind: 'template',
        name: 'TaskQueue',
        range: expect.objectContaining({ startLine: 8, startColumn: 3 }),
      }),
    ]);
  });
});
