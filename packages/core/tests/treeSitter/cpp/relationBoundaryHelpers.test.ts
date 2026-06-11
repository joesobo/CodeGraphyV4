import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { describe, expect, it } from 'vitest';
import { readCppIncludedDeclarations } from '../../../src/treeSitter/runtime/analyzeCpp/relationIncludes';
import { readCppDeclaredMethodSymbols } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredMethods';
import {
  readCppDeclaredFunctionNames,
  readCppDefinedFunctionNames,
} from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredFunctions';
import { readCppDeclaredTypeNames } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredTypes';
import { readCppDeclaratorName } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaratorNames';
import { readCppFunctionSymbolName, readQualifiedCppFunctionName } from '../../../src/treeSitter/runtime/analyzeCpp/relationFunctionNames';
import type { CppIncludedDeclarations } from '../../../src/treeSitter/runtime/analyzeCpp/relationModel';
import { readCppOverrideMethods } from '../../../src/treeSitter/runtime/analyzeCpp/relationOverrideMethods';
import {
  resolveCppOverridePath,
  resolveCppOverrideSymbolId,
} from '../../../src/treeSitter/runtime/analyzeCpp/relationOverrideResolution';
import { isPureVirtualDeclaration, readContainingCppTypeName } from '../../../src/treeSitter/runtime/analyzeCpp/relationScopes';
import { addCppTypeRelations } from '../../../src/treeSitter/runtime/analyzeCpp/relationType';
import { readCppTypeName } from '../../../src/treeSitter/runtime/analyzeCpp/relationTypeNames';
import { addCppSemanticRelations } from '../../../src/treeSitter/runtime/analyzeCpp/semanticRelations';

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
  functionPathByName: Map<string, string | null>;
  functionSymbolIdByName: Map<string, string>;
}> = {}): CppIncludedDeclarations {
  return {
    functionPathByName: overrides.functionPathByName ?? new Map(),
    functionSymbolIdByName: overrides.functionSymbolIdByName ?? new Map(),
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
    const qualifiedDeclarator = createNode({
      type: 'qualified_identifier',
      text: 'taskrunner::Worker::run',
      namedChildren: [
        createNode({ type: 'namespace_identifier', text: 'taskrunner' }),
        createNode({ type: 'namespace_identifier', text: 'Worker' }),
        identifier('run'),
      ],
    });

    expect(readCppDeclaratorName(undefined)).toBeNull();
    expect(readCppDeclaratorName(fieldIdentifier('field_'))).toBe('field_');
    expect(readCppDeclaratorName(qualifiedDeclarator)).toBe('run');
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
      type: 'template_type',
      fields: { name: typeIdentifier('FieldName') },
      namedChildren: [typeIdentifier('ChildName')],
    }))).toBe('FieldName');
    expect(readCppTypeName(createNode({
      type: 'qualified_identifier',
      text: 'taskrunner::types::TaskQueue',
      namedChildren: [
        createNode({ type: 'namespace_identifier', text: 'taskrunner' }),
        createNode({ type: 'namespace_identifier', text: 'types' }),
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

  it('ignores declared and defined functions without function names', () => {
    const namelessDeclarator = functionDeclarator(createNode({ type: 'destructor_name' }));
    const namelessDefinition = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(createNode({ type: 'destructor_name' })) },
    });
    const root = createNode({
      type: 'translation_unit',
      namedChildren: [namelessDeclarator, namelessDefinition],
    });

    expect(readCppDeclaredFunctionNames(root)).toEqual([]);
    expect(readCppDefinedFunctionNames(root)).toEqual([]);
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
    const namelessInlineMethod = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(createNode({ type: 'destructor_name' })) },
    });
    const nestedPureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void nested() = 0;',
      namedChildren: [functionDeclarator(identifier('nested'))],
    });
    const methodWithNestedType = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(qualifiedIdentifier(['Worker', 'run'])) },
      namedChildren: [
        functionDeclarator(qualifiedIdentifier(['Worker', 'run'])),
        nestedPureVirtual,
      ],
    });
    const classNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Worker') },
      namedChildren: [
        pureVirtual,
        invalidPureVirtual,
        namelessPureVirtual,
        namelessInlineMethod,
        methodWithNestedType,
      ],
    });
    const root = createNode({
      type: 'translation_unit',
      namedChildren: [
        classNode,
        freeFunction,
        createNode({
          type: 'field_declaration',
          text: 'virtual void orphan() = 0;',
          namedChildren: [functionDeclarator(identifier('orphan'))],
        }),
      ],
    });

    expect(readCppDeclaredMethodSymbols(root)).toEqual([
      { methodName: 'execute', symbolName: 'Worker::execute' },
      { methodName: 'run', symbolName: 'Worker::run' },
    ]);
  });

  it('reads only function declarators with explicit override specifiers as overrides', () => {
    const overrideMethod = functionDeclarator(identifier('run'), [
      createNode({ type: 'virtual_specifier', text: 'override' }),
    ]);
    const textOnlyOverride = functionDeclarator(identifier('textOnly'), [
      identifier('override'),
    ]);
    const virtualOnly = functionDeclarator(identifier('virtualOnly'), [
      createNode({ type: 'virtual_specifier', text: 'final' }),
    ]);
    const namelessOverride = functionDeclarator(createNode({ type: 'destructor_name' }), [
      createNode({ type: 'virtual_specifier', text: 'override' }),
    ]);
    const nonFunctionOverride = createNode({
      type: 'declaration',
      namedChildren: [
        createNode({ type: 'virtual_specifier', text: 'override' }),
        identifier('notFunction'),
      ],
    });
    const typeNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Worker') },
      namedChildren: [
        overrideMethod,
        textOnlyOverride,
        virtualOnly,
        namelessOverride,
        nonFunctionOverride,
      ],
    });

    expect(readCppOverrideMethods(typeNode)).toEqual([
      { methodName: 'run', sourceSymbolKind: 'class' },
    ]);
  });

  it('keeps include declaration collection empty for missing includes', () => {
    const declarations = readCppIncludedDeclarations(
      createNode({ type: 'translation_unit' }),
      '/workspace/app.cpp',
      '/workspace',
      [{ kind: 'include', resolvedPath: '/workspace/missing.hpp' } as IAnalysisRelation],
    );

    expect(declarations).toEqual({
      functionPathByName: new Map(),
      functionSymbolIdByName: new Map(),
      methodCallPathByName: new Map(),
      methodSymbolIdByName: new Map(),
      methodPathByName: new Map(),
      typePathByName: new Map(),
    });
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

  it('resolves override paths and symbols only from concrete target paths', () => {
    const declarations = includedDeclarations({
      methodPathByName: new Map([
        ['run', '/workspace/base.hpp'],
        ['fallback', '/workspace/other.hpp'],
      ]),
      methodSymbolIdByName: new Map([
        ['run', '/workspace/base.hpp:method:Base::run'],
        ['ghost', 'null:method:Ghost::ghost'],
      ]),
    });

    expect(resolveCppOverridePath(declarations, [null, '/workspace/base.hpp'], 'run')).toBe('/workspace/base.hpp');
    expect(resolveCppOverridePath(declarations, [null, '/workspace/first.hpp'], 'fallback')).toBe('/workspace/first.hpp');
    expect(resolveCppOverrideSymbolId(declarations, null, 'ghost')).toBeUndefined();
  });

  it('does not walk nested type declarations after adding semantic type relations', () => {
    const declarations = includedDeclarations({
      typePathByName: new Map([['Base', '/workspace/base.hpp']]),
    });
    const relations: IAnalysisRelation[] = [];
    const nestedType = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Nested') },
      namedChildren: [
        typeIdentifier('Nested'),
        createNode({ type: 'base_class_clause', namedChildren: [typeIdentifier('Base')] }),
      ],
    });
    const outerType = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Outer') },
      namedChildren: [
        typeIdentifier('Outer'),
        nestedType,
      ],
    });
    const rootNode = createNode({
      type: 'translation_unit',
      namedChildren: [outerType],
    });

    addCppSemanticRelations(rootNode, '/workspace/app.cpp', '/workspace', relations, true);

    expect(declarations).toBeDefined();
    expect(relations).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ specifier: 'Base' }),
    ]));
  });
});
