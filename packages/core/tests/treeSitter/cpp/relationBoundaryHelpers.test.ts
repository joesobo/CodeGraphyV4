import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import { readCppDeclaredMethodSymbols } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredMethods';
import { readCppDeclaredTypeNames } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredTypes';
import { readCppDeclaratorName } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaratorNames';
import { readCppFunctionSymbolName, readQualifiedCppFunctionName } from '../../../src/treeSitter/runtime/analyzeCpp/relationFunctionNames';
import type { CppIncludedDeclarations } from '../../../src/treeSitter/runtime/analyzeCpp/relationModel';
import { isPureVirtualDeclaration, readContainingCppTypeName } from '../../../src/treeSitter/runtime/analyzeCpp/relationScopes';
import { addCppTypeRelations } from '../../../src/treeSitter/runtime/analyzeCpp/relationType';
import { readCppTypeName } from '../../../src/treeSitter/runtime/analyzeCpp/relationTypeNames';

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

function includedDeclarations(overrides: Partial<{
  methodPathByName: Map<string, string | null>;
  methodSymbolIdByName: Map<string, string>;
  typePathByName: Map<string, string | null>;
}> = {}): CppIncludedDeclarations {
  return {
    functionPathByName: new Map(),
    functionSymbolIdByName: new Map(),
    methodCallPathByName: new Map(),
    methodSymbolIdByName: overrides.methodSymbolIdByName ?? new Map(),
    methodPathByName: overrides.methodPathByName ?? new Map(),
    typePathByName: overrides.typePathByName ?? new Map(),
  };
}

describe('pipeline/plugins/treesitter/runtime/analyzeCpp relation boundary helpers', () => {
  it('reads declarator and function names only from matching declarator evidence', () => {
    const nestedQualified = functionDeclarator(qualifiedIdentifier(['Worker', 'run']));
    const trailingMiss = createNode({
      type: 'qualified_identifier',
      namedChildren: [],
    });
    const namedChildQualified = createNode({
      type: 'function_declarator',
      namedChildren: [nestedQualified],
    });

    expect(readCppDeclaratorName(undefined)).toBeNull();
    expect(readCppDeclaratorName(fieldIdentifier('field_'))).toBe('field_');
    expect(readCppDeclaratorName(createNode({
      type: 'pointer_declarator',
      fields: { declarator: identifier('selected') },
    }))).toBe('selected');
    expect(readCppDeclaratorName(trailingMiss)).toBeNull();
    expect(readQualifiedCppFunctionName(undefined)).toBeNull();
    expect(readQualifiedCppFunctionName(namedChildQualified)).toBe('Worker::run');
    expect(readCppFunctionSymbolName(createNode({ type: 'function_definition' }))).toBeNull();
  });

  it('reads type names through templates and qualified names without treating other nodes as types', () => {
    expect(readCppTypeName(createNode({
      type: 'template_type',
      namedChildren: [typeIdentifier('TaskQueue')],
    }))).toBe('TaskQueue');
    expect(readCppTypeName(createNode({
      type: 'qualified_identifier',
      text: 'taskrunner::TaskQueue',
      namedChildren: [
        createNode({ type: 'namespace_identifier', text: 'taskrunner' }),
        typeIdentifier('TaskQueue'),
      ],
    }))).toBe('TaskQueue');
    expect(readCppTypeName(createNode({ type: 'qualified_identifier', namedChildren: [] }))).toBeNull();
    expect(readCppTypeName(createNode({ type: 'primitive_type', text: 'int' }))).toBeNull();
  });

  it('ignores unnamed declared types and requires exact pure virtual suffixes', () => {
    const pureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void compact()=0;',
      namedChildren: [functionDeclarator(identifier('compact'))],
    });
    const invalidPureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void invalid() = 0extra;',
      namedChildren: [functionDeclarator(identifier('invalid'))],
    });
    const classNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Worker') },
      namedChildren: [
        typeIdentifier('Worker'),
        pureVirtual,
        invalidPureVirtual,
        createNode({ type: 'struct_specifier' }),
      ],
    });

    expect(readCppDeclaredTypeNames(classNode)).toEqual(['Worker']);
    expect(isPureVirtualDeclaration(createNode({
      type: 'field_declaration',
      text: 'virtual void trimmed() = 0\n',
    }))).toBe(true);
    expect(isPureVirtualDeclaration(pureVirtual)).toBe(true);
    expect(isPureVirtualDeclaration(invalidPureVirtual)).toBe(false);
    expect(readContainingCppTypeName(createNode({ type: 'field_declaration' }))).toBeNull();
  });

  it('declares only method symbols that have method, class, and pure virtual evidence', () => {
    const pureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void execute() = 0;',
      namedChildren: [functionDeclarator(identifier('execute'))],
    });
    const invalidPureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void invalid() = 0extra;',
      namedChildren: [functionDeclarator(identifier('invalid'))],
    });
    const namelessPureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void () = 0;',
      namedChildren: [functionDeclarator(createNode({ type: 'destructor_name' }))],
    });
    const freeFunction = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(identifier('free')) },
    });
    const classNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Worker') },
      namedChildren: [
        pureVirtual,
        invalidPureVirtual,
        namelessPureVirtual,
      ],
    });
    const root = createNode({
      type: 'translation_unit',
      namedChildren: [classNode, freeFunction],
    });

    expect(readCppDeclaredMethodSymbols(root)).toEqual([
      { methodName: 'execute', symbolName: 'Worker::execute' },
    ]);
  });

  it('adds type relations without symbol ids when symbols are disabled or type names are missing', () => {
    const declarations = includedDeclarations({
      typePathByName: new Map([
        ['Base', '/workspace/base.hpp'],
        ['Other', '/workspace/other.hpp'],
      ]),
      methodPathByName: new Map([['run', '/workspace/base.hpp']]),
      methodSymbolIdByName: new Map([['run', '/workspace/base.hpp:method:Base::run']]),
    });
    const relations: IAnalysisRelation[] = [];
    const baseClause = createNode({
      type: 'base_class_clause',
      namedChildren: [typeIdentifier('Base')],
    });
    const overrideMethod = functionDeclarator(identifier('run'), [createNode({ type: 'virtual_specifier', text: 'override' })]);
    const structNode = createNode({
      type: 'struct_specifier',
      fields: { name: typeIdentifier('Derived') },
      namedChildren: [typeIdentifier('Derived'), baseClause, overrideMethod],
    });
    const unionNode = createNode({
      type: 'union_specifier',
      fields: { name: typeIdentifier('UnionDerived') },
      namedChildren: [typeIdentifier('UnionDerived'), createNode({
        type: 'base_class_clause',
        namedChildren: [typeIdentifier('Other')],
      })],
    });

    addCppTypeRelations(structNode, '/workspace/derived.cpp', relations, declarations, false);
    addCppTypeRelations(unionNode, '/workspace/union.cpp', relations, declarations, true);
    addCppTypeRelations(createNode({ type: 'class_specifier', namedChildren: [baseClause] }), '/workspace/anon.cpp', relations, declarations, true);

    const disabledInherit = relations.find((relation) =>
      relation.kind === 'inherit'
      && relation.fromFilePath === '/workspace/derived.cpp'
      && relation.specifier === 'Base'
    );
    const disabledOverride = relations.find((relation) =>
      relation.kind === 'overrides'
      && relation.fromFilePath === '/workspace/derived.cpp'
      && relation.specifier === 'run'
    );

    expect(disabledInherit).toEqual(expect.objectContaining({
      resolvedPath: '/workspace/base.hpp',
    }));
    expect(disabledInherit).not.toHaveProperty('fromSymbolId');
    expect(disabledOverride).toEqual(expect.objectContaining({
      resolvedPath: '/workspace/base.hpp',
      toSymbolId: '/workspace/base.hpp:method:Base::run',
    }));
    expect(disabledOverride).not.toHaveProperty('fromSymbolId');
    expect(relations).toContainEqual(expect.objectContaining({
      kind: 'inherit',
      specifier: 'Other',
      fromSymbolId: '/workspace/union.cpp:union:UnionDerived',
      resolvedPath: '/workspace/other.hpp',
    }));
  });
});
