import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import { addNamedSymbol, createRangeSignature } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/create';
import { getDeclaratorNameNodes } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/declarator/candidates';
import { getDeclaratorNameNode } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/declarator/nameNode';
import {
  findFirstDeclaratorNameNode,
  findLastDeclaratorNameNode,
} from '../../../src/treeSitter/runtime/analyzeCpp/symbol/declarator/search';
import { findDescendantByType } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/lookup/descendants';
import { handleCppDeclaration } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/variable/declaration';
import { handleCppFieldDeclaration } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/variable/field';
import {
  handleCppFunctionDefinition,
} from '../../../src/treeSitter/runtime/analyzeCpp/symbol/callables';
import {
  getDeclarationNameNode,
  getFunctionNameNode,
  readQualifiedFunctionDeclaratorText,
} from '../../../src/treeSitter/runtime/analyzeCpp/symbol/lookup/names';
import { handleCppForRangeLoop } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/variable/loop';
import { handleCppParameterDeclaration } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/variable/parameter';
import { hasFunctionDeclarator, isInsideClassLike } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/scope';
import {
  handleCppAliasDeclaration,
  handleCppTemplateDeclaration,
  handleCppTypeDeclaration,
} from '../../../src/treeSitter/runtime/analyzeCpp/symbol/type/declaration';
import { getTemplateDeclarationNameNode } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/type/templates';
import { handleCppSymbol } from '../../../src/treeSitter/runtime/analyzeCpp/symbol/walk';

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

function qualifiedIdentifier(parts: string[]): Parser.SyntaxNode {
  return createNode({
    type: 'qualified_identifier',
    text: parts.join('::'),
    namedChildren: parts.map((part, index) =>
      index === parts.length - 1 ? identifier(part) : createNode({ type: 'namespace_identifier', text: part })
    ),
  });
}

describe('pipeline/plugins/treesitter/runtime/analyzeCpp symbol helpers', () => {
  it('finds declarator name nodes through identifier, qualified, nested, and fallback declarators', () => {
    const qualified = qualifiedIdentifier(['taskrunner', 'TaskRunner', 'run']);
    const parameter = createNode({ type: 'parameter_declaration', namedChildren: [identifier('skip_me')] });
    const nested = createNode({
      type: 'pointer_declarator',
      fields: {
        declarator: createNode({
          type: 'array_declarator',
          fields: { declarator: fieldIdentifier('items_') },
        }),
      },
    });
    const fallback = createNode({
      type: 'declaration',
      namedChildren: [parameter, createNode({ type: 'primitive_type', text: 'int' }), identifier('count')],
    });

    expect(getDeclaratorNameNode(null)).toBeNull();
    expect(getDeclaratorNameNode(createNode({ type: 'destructor_name', text: '~Runner' }))).toBeNull();
    expect(getDeclaratorNameNode(identifier('run'))?.text).toBe('run');
    expect(getDeclaratorNameNode(fieldIdentifier('id_'))?.text).toBe('id_');
    expect(getDeclaratorNameNode(qualified)?.text).toBe('run');
    expect(getDeclaratorNameNode(nested)?.text).toBe('items_');
    expect(getDeclaratorNameNode(fallback)?.text).toBe('count');
  });

  it('returns explicit declarator names before bare identifiers and can scan first or last matches', () => {
    const bareName = identifier('bare');
    const pointerName = createNode({
      type: 'pointer_declarator',
      fields: { declarator: identifier('selected') },
    });
    const declaration = createNode({
      type: 'declaration',
      namedChildren: [bareName, pointerName, fieldIdentifier('field_')],
    });

    expect(getDeclaratorNameNodes(declaration).map((node) => node.text)).toEqual(['selected']);
    expect(getDeclaratorNameNodes(createNode({
      type: 'declaration',
      namedChildren: [bareName, fieldIdentifier('field_')],
    })).map((node) => node.text)).toEqual(['bare', 'field_']);
    expect(findFirstDeclaratorNameNode([createNode({ type: 'comment' }), pointerName], getDeclaratorNameNode)?.text).toBe('selected');
    expect(findLastDeclaratorNameNode([pointerName, fieldIdentifier('last')], getDeclaratorNameNode)?.text).toBe('last');
    expect(findFirstDeclaratorNameNode([], getDeclaratorNameNode)).toBeNull();
    expect(findLastDeclaratorNameNode([], getDeclaratorNameNode)).toBeNull();
  });

  it('adds named symbols only when name evidence exists and preserves range signatures', () => {
    const symbols: IAnalysisSymbol[] = [];
    const rangeNode = createNode({ type: 'declaration', text: 'int count;', startRow: 4, startColumn: 2 });

    addNamedSymbol(symbols, '/workspace/src/app.cpp', 'local', identifier('count'), rangeNode);
    addNamedSymbol(symbols, '/workspace/src/app.cpp', 'local', identifier('alias'), rangeNode, 'renamed');
    addNamedSymbol(symbols, '/workspace/src/app.cpp', 'local', null, rangeNode);
    addNamedSymbol(symbols, '/workspace/src/app.cpp', 'local', identifier('empty'), rangeNode, '');

    expect(createRangeSignature(rangeNode)).toBe('5:3');
    expect(symbols).toEqual([
      expect.objectContaining({ id: '/workspace/src/app.cpp:local:count', name: 'count' }),
      expect.objectContaining({ id: '/workspace/src/app.cpp:local:renamed', name: 'renamed' }),
    ]);
  });

  it('reads declaration and function names from fields or descendants', () => {
    const declaration = createNode({
      type: 'declaration',
      namedChildren: [createNode({ type: 'primitive_type', text: 'int' }), identifier('count')],
    });
    const qualifiedFunction = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(qualifiedIdentifier(['Runner', 'run'])) },
    });

    expect(getDeclarationNameNode(createNode({ type: 'class_specifier', fields: { name: typeIdentifier('Runner') } }))?.text).toBe('Runner');
    expect(getDeclarationNameNode(declaration)?.text).toBe('count');
    expect(getDeclarationNameNode(createNode({ type: 'comment' }))).toBeNull();
    expect(getFunctionNameNode(qualifiedFunction)?.text).toBe('run');
    expect(readQualifiedFunctionDeclaratorText(qualifiedFunction)).toBe('Runner::run');
    expect(readQualifiedFunctionDeclaratorText(createNode({ type: 'function_definition' }))).toBeNull();
    expect(findDescendantByType(declaration, new Set(['identifier']))?.text).toBe('count');
    expect(findDescendantByType(undefined, new Set(['identifier']))).toBeNull();
  });

  it('classifies declarations as locals, globals, constants, or skipped function/class declarations', () => {
    const filePath = '/workspace/src/app.cpp';
    const symbols: IAnalysisSymbol[] = [];
    const classNode = createNode({ type: 'class_specifier', fields: { name: typeIdentifier('Runner') } });
    const classField = createNode({
      type: 'declaration',
      namedChildren: [identifier('member')],
      parent: classNode,
    });

    expect(handleCppDeclaration(createNode({
      type: 'declaration',
      namedChildren: [identifier('local_count')],
    }), filePath, symbols, { currentFunctionSymbolId: `${filePath}:function:run` })).toEqual({ skipChildren: true });
    expect(handleCppDeclaration(createNode({
      type: 'declaration',
      text: 'constexpr int kLimit = 2;',
      namedChildren: [identifier('kLimit')],
    }), filePath, symbols, {})).toEqual({ skipChildren: true });
    expect(handleCppDeclaration(createNode({
      type: 'declaration',
      text: 'int global_count;',
      namedChildren: [identifier('global_count')],
    }), filePath, symbols, {})).toEqual({ skipChildren: true });
    expect(handleCppDeclaration(createNode({
      type: 'declaration',
      namedChildren: [functionDeclarator(identifier('declared_only'))],
    }), filePath, symbols, {})).toEqual({ skipChildren: true });
    expect(handleCppDeclaration(classField, filePath, symbols, {})).toBeUndefined();

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'local', name: 'local_count' }),
      expect.objectContaining({ kind: 'constant', name: 'kLimit' }),
      expect.objectContaining({ kind: 'global', name: 'global_count' }),
    ]);
    expect(hasFunctionDeclarator(createNode({ type: 'declaration', namedChildren: [functionDeclarator(identifier('run'))] }))).toBe(true);
    expect(isInsideClassLike(classField)).toBe(true);
  });

  it('handles field declarations and pure virtual method parameters', () => {
    const filePath = '/workspace/src/worker.hpp';
    const symbols: IAnalysisSymbol[] = [];
    const classNode = createNode({ type: 'class_specifier', fields: { name: typeIdentifier('Worker') } });
    const fieldDeclaration = createNode({
      type: 'field_declaration',
      namedChildren: [fieldIdentifier('id_')],
      parent: classNode,
    });
    const pureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void execute(int count, Task task) = 0',
      namedChildren: [
        functionDeclarator(identifier('execute')),
        createNode({ type: 'parameter_declaration', namedChildren: [identifier('count')], startRow: 2, startColumn: 21 }),
        createNode({ type: 'parameter_declaration', namedChildren: [identifier('task')], startRow: 2, startColumn: 32 }),
      ],
      parent: classNode,
    });

    expect(handleCppFieldDeclaration(fieldDeclaration, filePath, symbols, { currentClassName: 'Worker' })).toEqual({ skipChildren: true });
    expect(handleCppFieldDeclaration(pureVirtual, filePath, symbols, { currentClassName: 'Worker' })).toEqual({ skipChildren: true });
    expect(handleCppFieldDeclaration(pureVirtual, filePath, symbols, {})).toEqual({ skipChildren: true });

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'field', name: 'id_' }),
      expect.objectContaining({ kind: 'method', name: 'Worker::execute' }),
      expect.objectContaining({ kind: 'parameter', name: 'count', signature: '3:22' }),
      expect.objectContaining({ kind: 'parameter', name: 'task', signature: '3:33' }),
    ]);
  });

  it('adds local variables from range loops and parameter variables only inside functions', () => {
    const filePath = '/workspace/src/runner.cpp';
    const symbols: IAnalysisSymbol[] = [];
    const rangeLoop = createNode({
      type: 'for_range_loop',
      namedChildren: [
        createNode({ type: 'primitive_type', text: 'const auto' }),
        createNode({ type: 'reference_declarator', fields: { declarator: identifier('task') } }),
      ],
    });
    const parameter = createNode({
      type: 'parameter_declaration',
      namedChildren: [createNode({ type: 'primitive_type', text: 'int' }), identifier('limit')],
      startRow: 10,
      startColumn: 12,
    });

    handleCppForRangeLoop(rangeLoop, filePath, symbols, {});
    handleCppForRangeLoop(rangeLoop, filePath, symbols, { currentFunctionSymbolId: `${filePath}:function:run` });
    expect(handleCppParameterDeclaration(parameter, filePath, symbols, {})).toBeUndefined();
    expect(handleCppParameterDeclaration(parameter, filePath, symbols, { currentFunctionSymbolId: `${filePath}:function:run` })).toEqual({ skipChildren: true });

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'local', name: 'task' }),
      expect.objectContaining({ kind: 'parameter', name: 'limit', signature: '11:13' }),
    ]);
  });

  it('handles C++ function definitions as free functions, class methods, and qualified methods', () => {
    const filePath = '/workspace/src/runner.cpp';
    const symbols: IAnalysisSymbol[] = [];
    const freeFunction = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(identifier('run')) },
    });
    const qualifiedMethod = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(qualifiedIdentifier(['Runner', 'execute'])) },
    });

    expect(handleCppFunctionDefinition(createNode({ type: 'function_definition' }), filePath, symbols, {})).toEqual({ skipChildren: true });
    expect(handleCppFunctionDefinition(freeFunction, filePath, symbols, {})).toEqual({
      nextContext: {
        currentFunctionSymbolId: `${filePath}:function:run`,
        currentSymbolId: `${filePath}:function:run`,
      },
    });
    expect(handleCppFunctionDefinition(freeFunction, filePath, symbols, { currentClassName: 'Runner' })).toEqual({
      nextContext: {
        currentClassName: 'Runner',
        currentFunctionSymbolId: `${filePath}:method:Runner::run`,
        currentSymbolId: `${filePath}:method:Runner::run`,
      },
    });
    expect(handleCppFunctionDefinition(qualifiedMethod, filePath, symbols, {})).toEqual({
      nextContext: {
        currentFunctionSymbolId: `${filePath}:method:Runner::execute`,
        currentSymbolId: `${filePath}:method:Runner::execute`,
      },
    });
    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'function', name: 'run' }),
      expect.objectContaining({ kind: 'method', name: 'Runner::run' }),
      expect.objectContaining({ kind: 'method', name: 'Runner::execute' }),
    ]);
  });

  it('handles alias, template, and type declarations with state restoration', () => {
    const filePath = '/workspace/src/types.cpp';
    const symbols: IAnalysisSymbol[] = [];
    const alias = createNode({
      type: 'alias_declaration',
      fields: { name: typeIdentifier('TaskId') },
    });
    const className = typeIdentifier('TaskQueue');
    const classDeclaration = createNode({
      type: 'class_specifier',
      fields: { name: className },
      namedChildren: [className],
    });
    const templateDeclaration = createNode({
      type: 'template_declaration',
      namedChildren: [createNode({ type: 'template_parameter_list', text: '<typename Task>' }), classDeclaration],
    });

    expect(handleCppAliasDeclaration(alias, filePath, symbols)).toEqual({ skipChildren: true });
    expect(getTemplateDeclarationNameNode(classDeclaration)?.text).toBe('TaskQueue');
    const templateAction = handleCppTemplateDeclaration(templateDeclaration, filePath, symbols, { currentClassName: 'Outer' });
    const suppressedAction = handleCppTypeDeclaration(classDeclaration, filePath, symbols, templateAction.nextContext ?? {});
    const typeAction = handleCppTypeDeclaration(createNode({
      type: 'union_specifier',
      fields: { name: typeIdentifier('Payload') },
    }), filePath, symbols, suppressedAction.nextContext ?? {});

    expect(templateAction.nextContext).toEqual({ currentClassName: 'Outer', suppressTypeDeclarationSymbol: true });
    expect(suppressedAction.nextContext).toEqual({ currentClassName: 'TaskQueue', suppressTypeDeclarationSymbol: false });
    expect(typeAction.nextContext).toEqual({ currentClassName: 'Payload', suppressTypeDeclarationSymbol: false });
    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'alias', name: 'TaskId' }),
      expect.objectContaining({ kind: 'template', name: 'TaskQueue' }),
      expect.objectContaining({ kind: 'union', name: 'Payload' }),
    ]);
  });

  it('dispatches supported C++ symbol node handlers and ignores unsupported nodes', () => {
    const filePath = '/workspace/src/types.cpp';
    const symbols: IAnalysisSymbol[] = [];

    expect(handleCppSymbol(createNode({ type: 'comment' }), filePath, symbols, {})).toBeUndefined();
    expect(handleCppSymbol(createNode({
      type: 'alias_declaration',
      fields: { name: typeIdentifier('TaskId') },
    }), filePath, symbols, {})).toEqual({ skipChildren: true });
    expect(handleCppSymbol(createNode({
      type: 'namespace_definition',
      fields: { name: createNode({ type: 'namespace_identifier', text: 'taskrunner' }) },
    }), filePath, symbols, {})).toBeUndefined();

    expect(symbols).toEqual([
      expect.objectContaining({ kind: 'alias', name: 'TaskId' }),
      expect.objectContaining({ kind: 'namespace', name: 'taskrunner' }),
    ]);
  });
});
