import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import {
  handleCppTemplateDeclaration,
  handleCppTypeDeclaration,
} from '../../../src/treeSitter/runtime/analyzeCpp/symbol/type/declaration';
import type { CppSymbolWalkState } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/model';

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

describe('pipeline/plugins/treesitter/runtime/analyzeCpp/symbolTypes', () => {
  it('adds template symbols from the declaration target and suppresses duplicate type symbols', () => {
    const symbols: IAnalysisSymbol[] = [];
    const filePath = '/workspace/src/queue.cpp';
    const templateParameterList = createNode({ type: 'template_parameter_list', text: '<typename Item>' });
    const decoyIdentifier = createNode({ type: 'type_identifier', text: 'Item' });
    const queueName = createNode({ type: 'type_identifier', text: 'Queue' });
    const queueClass = createNode({
      type: 'class_specifier',
      text: 'class Queue {}',
      fields: { name: queueName },
      namedChildren: [queueName],
    });
    const templateDeclaration = createNode({
      type: 'template_declaration',
      namedChildren: [templateParameterList, decoyIdentifier, queueClass],
    });

    const templateAction = handleCppTemplateDeclaration(templateDeclaration, filePath, symbols, {});
    const suppressedState = templateAction.nextContext as CppSymbolWalkState;
    const suppressedTypeAction = handleCppTypeDeclaration(queueClass, filePath, symbols, suppressedState);
    const restoredState = suppressedTypeAction.nextContext as CppSymbolWalkState;

    handleCppTypeDeclaration(queueClass, filePath, symbols, restoredState);

    expect(templateAction).toEqual({
      nextContext: {
        suppressTypeDeclarationSymbol: true,
      },
    });
    expect(suppressedTypeAction).toEqual({
      nextContext: {
        currentClassName: 'Queue',
        suppressTypeDeclarationSymbol: false,
      },
    });
    expect(symbols).toEqual([
      expect.objectContaining({ id: `${filePath}:template:Queue`, kind: 'template', name: 'Queue' }),
      expect.objectContaining({ id: `${filePath}:class:Queue`, kind: 'class', name: 'Queue' }),
    ]);
  });

  it('adds template symbols from function declarations', () => {
    const symbols: IAnalysisSymbol[] = [];
    const filePath = '/workspace/src/queue.cpp';
    const itemType = createNode({ type: 'type_identifier', text: 'Item' });
    const unwrapName = createNode({ type: 'identifier', text: 'unwrap' });
    const unwrapDeclarator = createNode({
      type: 'function_declarator',
      text: 'unwrap(Item value)',
      fields: { declarator: unwrapName },
      namedChildren: [unwrapName],
    });
    const unwrapDeclaration = createNode({
      type: 'declaration',
      text: 'Item unwrap(Item value);',
      namedChildren: [itemType, unwrapDeclarator],
    });
    const templateDeclaration = createNode({
      type: 'template_declaration',
      namedChildren: [
        createNode({ type: 'template_parameter_list', text: '<typename Item>' }),
        unwrapDeclaration,
      ],
    });

    handleCppTemplateDeclaration(templateDeclaration, filePath, symbols, {});

    expect(symbols).toEqual([
      expect.objectContaining({ id: `${filePath}:template:unwrap`, kind: 'template', name: 'unwrap' }),
    ]);
  });
});
