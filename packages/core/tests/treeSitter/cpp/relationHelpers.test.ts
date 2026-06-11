import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { afterEach, describe, expect, it } from 'vitest';
import { addCppCallRelation } from '../../../src/treeSitter/runtime/analyzeCpp/relationCall';
import { readCppCallName } from '../../../src/treeSitter/runtime/analyzeCpp/relationCallNames';
import { resolveCppCallTarget } from '../../../src/treeSitter/runtime/analyzeCpp/relationCallTargets';
import { readCppDeclaratorName } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaratorNames';
import {
  readCppDeclaredFunctionNames,
  readCppDefinedFunctionNames,
} from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredFunctions';
import { readCppDeclaredMethodNames } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredMethodNames';
import { readCppDeclaredMethodSymbols } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredMethodSymbols';
import { readCppDeclaredTypeNames } from '../../../src/treeSitter/runtime/analyzeCpp/relationDeclaredTypes';
import { readCppFunctionSymbolName, readQualifiedCppFunctionName } from '../../../src/treeSitter/runtime/analyzeCpp/relationFunctionNames';
import { addCppInheritRelations } from '../../../src/treeSitter/runtime/analyzeCpp/relationInheritance';
import {
  readIncludedCppRootNode,
  readInitialIncludedPaths,
  readTransitiveIncludedPaths,
} from '../../../src/treeSitter/runtime/analyzeCpp/relationIncludeTraversal';
import type { CppIncludedDeclarations } from '../../../src/treeSitter/runtime/analyzeCpp/relationModel';
import { readCppOverrideMethods } from '../../../src/treeSitter/runtime/analyzeCpp/relationOverrideMethods';
import {
  readCppOverrideSourceSymbolId,
  resolveCppOverridePath,
  resolveCppOverrideSymbolId,
} from '../../../src/treeSitter/runtime/analyzeCpp/relationOverrideResolution';
import { isInsideClassLike, isInsideFunctionDefinition, isPureVirtualDeclaration, readContainingCppTypeName } from '../../../src/treeSitter/runtime/analyzeCpp/relationScopes';
import { addCppTypeRelations } from '../../../src/treeSitter/runtime/analyzeCpp/relationType';
import { readCppTypeName } from '../../../src/treeSitter/runtime/analyzeCpp/relationTypeNames';

const tempRoots: string[] = [];

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
  functionPathByName: Map<string, string | null>;
  functionSymbolIdByName: Map<string, string>;
  methodCallPathByName: Map<string, string | null>;
  methodSymbolIdByName: Map<string, string>;
  methodPathByName: Map<string, string | null>;
  typePathByName: Map<string, string | null>;
}> = {}): CppIncludedDeclarations {
  return {
    functionPathByName: overrides.functionPathByName ?? new Map(),
    functionSymbolIdByName: overrides.functionSymbolIdByName ?? new Map(),
    methodCallPathByName: overrides.methodCallPathByName ?? new Map(),
    methodSymbolIdByName: overrides.methodSymbolIdByName ?? new Map(),
    methodPathByName: overrides.methodPathByName ?? new Map(),
    typePathByName: overrides.typePathByName ?? new Map(),
  };
}

afterEach(async () => {
  await Promise.all(tempRoots.splice(0).map((tempRoot) => fs.rm(tempRoot, { recursive: true, force: true })));
});

describe('pipeline/plugins/treesitter/runtime/analyzeCpp relation helpers', () => {
  it('reads declarator names through identifiers, qualified identifiers, fields, and nested children', () => {
    const qualified = qualifiedIdentifier(['taskrunner', 'TaskRunner', 'run']);
    const nested = createNode({
      type: 'pointer_declarator',
      fields: { declarator: createNode({ type: 'reference_declarator', fields: { declarator: fieldIdentifier('field_') } }) },
    });
    const fallback = createNode({
      type: 'declaration',
      namedChildren: [createNode({ type: 'primitive_type', text: 'int' }), identifier('count')],
    });

    expect(readCppDeclaratorName(undefined)).toBeNull();
    expect(readCppDeclaratorName(identifier('run'))).toBe('run');
    expect(readCppDeclaratorName(fieldIdentifier('id_'))).toBe('id_');
    expect(readCppDeclaratorName(qualified)).toBe('run');
    expect(readCppDeclaratorName(nested)).toBe('field_');
    expect(readCppDeclaratorName(fallback)).toBe('count');
  });

  it('reads call names from member, function, constructor, and type call expressions', () => {
    const memberCall = createNode({
      type: 'call_expression',
      fields: {
        function: createNode({
          type: 'field_expression',
          fields: { field: fieldIdentifier('execute') },
        }),
      },
    });
    const fallbackMemberCall = createNode({
      type: 'call_expression',
      fields: {
        function: createNode({
          type: 'field_expression',
          namedChildren: [identifier('worker'), fieldIdentifier('flush')],
        }),
      },
    });
    const constructorCall = createNode({
      type: 'call_expression',
      namedChildren: [typeIdentifier('Task')],
    });

    expect(readCppCallName(createNode({ type: 'call_expression', namedChildren: [] }))).toBeNull();
    expect(readCppCallName(memberCall)).toBe('execute');
    expect(readCppCallName(fallbackMemberCall)).toBe('flush');
    expect(readCppCallName(createNode({ type: 'call_expression', fields: { function: identifier('make_task') } }))).toBe('make_task');
    expect(readCppCallName(constructorCall)).toBe('Task');
  });

  it('resolves function, method, and constructor call targets with symbol ids from matching files only', () => {
    const declarations = includedDeclarations({
      functionPathByName: new Map([['make_task', '/workspace/task.hpp']]),
      functionSymbolIdByName: new Map([['make_task', '/workspace/task.hpp:function:make_task']]),
      methodCallPathByName: new Map([['execute', '/workspace/worker.hpp']]),
      methodSymbolIdByName: new Map([['execute', '/other.hpp:method:Worker::execute']]),
      typePathByName: new Map([['Task', '/workspace/task.hpp']]),
    });

    expect(resolveCppCallTarget(declarations, 'make_task')).toEqual({
      filePath: '/workspace/task.hpp',
      symbolId: '/workspace/task.hpp:function:make_task',
    });
    expect(resolveCppCallTarget(declarations, 'execute')).toEqual({
      filePath: '/workspace/worker.hpp',
    });
    expect(resolveCppCallTarget(declarations, 'Task')).toEqual({
      filePath: '/workspace/task.hpp',
    });
    expect(resolveCppCallTarget(declarations, 'missing')).toBeNull();
  });

  it('adds call relations with enclosing function or method symbols when symbols are enabled', () => {
    const declarations = includedDeclarations({
      functionPathByName: new Map([['make_task', '/workspace/task.hpp']]),
      functionSymbolIdByName: new Map([['make_task', '/workspace/task.hpp:function:make_task']]),
    });
    const call = createNode({ type: 'call_expression', fields: { function: identifier('make_task') } });
    const functionDefinition = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(identifier('run')) },
      namedChildren: [call],
    });

    const relations: IAnalysisRelation[] = [];
    addCppCallRelation(call, '/workspace/runner.cpp', relations, declarations, true);
    addCppCallRelation(call, '/workspace/runner.cpp', relations, declarations, false);
    addCppCallRelation(createNode({ type: 'call_expression' }), '/workspace/runner.cpp', relations, declarations, true);

    expect(functionDefinition).toBeDefined();
    expect(relations).toEqual([
      expect.objectContaining({
        kind: 'call',
        specifier: 'make_task',
        fromSymbolId: '/workspace/runner.cpp:function:run',
        toSymbolId: '/workspace/task.hpp:function:make_task',
        metadata: expect.objectContaining({
          bindingKind: 'named',
          importedName: 'make_task',
          localName: 'make_task',
          memberName: 'make_task',
        }),
      }),
      expect.objectContaining({
        kind: 'call',
        specifier: 'make_task',
        fromSymbolId: undefined,
      }),
    ]);
  });

  it('omits enclosing call symbol ids when the enclosing function has no name', () => {
    const declarations = includedDeclarations({
      functionPathByName: new Map([['make_task', '/workspace/task.hpp']]),
      functionSymbolIdByName: new Map([['make_task', '/workspace/task.hpp:function:make_task']]),
    });
    const call = createNode({ type: 'call_expression', fields: { function: identifier('make_task') } });
    createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(createNode({ type: 'destructor_name' })) },
      namedChildren: [call],
    });
    const relations: IAnalysisRelation[] = [];

    addCppCallRelation(call, '/workspace/runner.cpp', relations, declarations, true);

    expect(relations).toHaveLength(1);
    expect(relations[0]).toEqual(expect.objectContaining({
      kind: 'call',
      specifier: 'make_task',
      toSymbolId: '/workspace/task.hpp:function:make_task',
    }));
    expect(relations[0]?.fromSymbolId).toBeUndefined();
  });

  it('reads declared free functions, defined free functions, methods, and declared types separately', () => {
    const freeDeclaration = functionDeclarator(identifier('make_task'));
    const qualifiedMethod = functionDeclarator(qualifiedIdentifier(['Runner', 'run']));
    const classNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Runner') },
      namedChildren: [typeIdentifier('Runner'), createNode({ type: 'field_declaration', namedChildren: [functionDeclarator(identifier('execute'))] })],
    });
    const bootDeclarator = functionDeclarator(identifier('boot'));
    const functionDefinition = createNode({
      type: 'function_definition',
      fields: { declarator: bootDeclarator },
      namedChildren: [bootDeclarator],
    });
    const methodDefinition = createNode({
      type: 'function_definition',
      fields: { declarator: qualifiedMethod },
      namedChildren: [qualifiedMethod],
    });
    const root = createNode({
      type: 'translation_unit',
      namedChildren: [
        createNode({ type: 'declaration', namedChildren: [freeDeclaration] }),
        classNode,
        functionDefinition,
        methodDefinition,
      ],
    });

    expect(readCppDeclaredFunctionNames(root)).toEqual(['make_task', 'boot']);
    expect(readCppDefinedFunctionNames(root)).toEqual(['boot']);
    expect(readCppDeclaredMethodNames(root)).toEqual(['execute', 'run']);
    expect(readCppDeclaredTypeNames(root)).toEqual(['Runner']);
    expect(readCppFunctionSymbolName(methodDefinition)).toBe('Runner::run');
    expect(readQualifiedCppFunctionName(qualifiedMethod)).toBe('Runner::run');
  });

  it('reads defined and pure virtual method symbols with their qualified symbol names', () => {
    const pureVirtual = createNode({
      type: 'field_declaration',
      text: 'virtual void execute(int count) = 0;',
      namedChildren: [functionDeclarator(identifier('execute'))],
    });
    const classNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('Worker') },
      namedChildren: [
        typeIdentifier('Worker'),
        pureVirtual,
        createNode({
          type: 'function_definition',
          fields: { declarator: functionDeclarator(identifier('tick')) },
        }),
      ],
    });
    const qualifiedDefinition = createNode({
      type: 'function_definition',
      fields: { declarator: functionDeclarator(qualifiedIdentifier(['Worker', 'run'])) },
    });
    const root = createNode({ type: 'translation_unit', namedChildren: [classNode, qualifiedDefinition] });

    expect(readCppDeclaredMethodSymbols(root)).toEqual([
      { methodName: 'execute', symbolName: 'Worker::execute' },
      { methodName: 'tick', symbolName: 'tick' },
      { methodName: 'run', symbolName: 'Worker::run' },
    ]);
    expect(readContainingCppTypeName(pureVirtual)).toBe('Worker');
    expect(isPureVirtualDeclaration(pureVirtual)).toBe(true);
  });

  it('reads override methods from declarations and inline definitions', () => {
    const classOverride = functionDeclarator(identifier('execute'), [createNode({ type: 'virtual_specifier', text: 'override' })]);
    const inlineOverride = functionDeclarator(identifier('flush'), [createNode({ type: 'virtual_specifier', text: 'override' })]);
    const inlineDefinition = createNode({
      type: 'function_definition',
      fields: { declarator: inlineOverride },
      namedChildren: [inlineOverride],
    });
    const typeNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('ConsoleWorker') },
      namedChildren: [
        typeIdentifier('ConsoleWorker'),
        classOverride,
        inlineDefinition,
        functionDeclarator(identifier('helper')),
      ],
    });

    expect(readCppOverrideMethods(typeNode)).toEqual([
      { methodName: 'execute', sourceSymbolKind: 'class' },
      { methodName: 'flush', sourceSymbolKind: 'method' },
    ]);
    expect(isInsideFunctionDefinition(inlineOverride)).toBe(true);
    expect(isInsideClassLike(classOverride)).toBe(true);
  });

  it('resolves override source and target symbols only when path and symbol evidence agree', () => {
    const declarations = includedDeclarations({
      methodPathByName: new Map([['execute', '/workspace/worker.hpp']]),
      methodSymbolIdByName: new Map([
        ['execute', '/workspace/worker.hpp:method:Worker::execute'],
        ['wrong', '/workspace/other.hpp:method:Worker::wrong'],
      ]),
    });

    expect(readCppOverrideSourceSymbolId('/workspace/console.cpp', { methodName: 'execute', sourceSymbolKind: 'class' }, {
      symbolsEnabled: true,
      typeName: 'ConsoleWorker',
    })).toBe('/workspace/console.cpp:class:ConsoleWorker');
    expect(readCppOverrideSourceSymbolId('/workspace/console.cpp', { methodName: 'execute', sourceSymbolKind: 'method' }, {
      symbolsEnabled: true,
      typeName: 'ConsoleWorker',
    })).toBe('/workspace/console.cpp:method:ConsoleWorker::execute');
    expect(readCppOverrideSourceSymbolId('/workspace/console.cpp', { methodName: 'execute', sourceSymbolKind: 'class' }, {
      symbolsEnabled: false,
      typeName: 'ConsoleWorker',
    })).toBeUndefined();
    expect(resolveCppOverridePath(declarations, ['/workspace/other.hpp', '/workspace/worker.hpp'], 'execute')).toBe('/workspace/worker.hpp');
    expect(resolveCppOverridePath(declarations, ['/workspace/base.hpp'], 'missing')).toBe('/workspace/base.hpp');
    expect(resolveCppOverridePath(declarations, [null], 'missing')).toBeNull();
    expect(resolveCppOverrideSymbolId(declarations, '/workspace/worker.hpp', 'execute')).toBe('/workspace/worker.hpp:method:Worker::execute');
    expect(resolveCppOverrideSymbolId(declarations, '/workspace/worker.hpp', 'wrong')).toBeUndefined();
    expect(resolveCppOverrideSymbolId(declarations, null, 'execute')).toBeUndefined();
  });

  it('reads type names and adds inherit and override relations for C++ type declarations', () => {
    const baseClause = createNode({
      type: 'base_class_clause',
      namedChildren: [
        createNode({ type: 'access_specifier', text: 'public' }),
        typeIdentifier('Worker'),
        createNode({
          type: 'template_type',
          fields: { name: typeIdentifier('AuditedWorker') },
          namedChildren: [typeIdentifier('AuditedWorker')],
        }),
        createNode({
          type: 'qualified_identifier',
          text: 'taskrunner::SpecialWorker',
          namedChildren: [createNode({ type: 'namespace_identifier', text: 'taskrunner' }), typeIdentifier('SpecialWorker')],
        }),
      ],
    });
    const overrideMethod = functionDeclarator(identifier('execute'), [createNode({ type: 'virtual_specifier', text: 'override' })]);
    const typeNode = createNode({
      type: 'class_specifier',
      fields: { name: typeIdentifier('ConsoleWorker') },
      namedChildren: [typeIdentifier('ConsoleWorker'), baseClause, overrideMethod],
    });
    const declarations = includedDeclarations({
      typePathByName: new Map([
        ['Worker', '/workspace/worker.hpp'],
        ['AuditedWorker', '/workspace/audited.hpp'],
      ]),
      methodPathByName: new Map([['execute', '/workspace/worker.hpp']]),
      methodSymbolIdByName: new Map([['execute', '/workspace/worker.hpp:method:Worker::execute']]),
    });
    const relations: IAnalysisRelation[] = [];

    expect(readCppTypeName(baseClause.namedChildren[2])).toBe('AuditedWorker');
    expect(addCppInheritRelations(typeNode, '/workspace/console.cpp', relations, declarations, '/workspace/console.cpp:class:ConsoleWorker')).toEqual([
      '/workspace/worker.hpp',
      '/workspace/audited.hpp',
      null,
    ]);
    addCppTypeRelations(typeNode, '/workspace/console.cpp', relations, declarations, true);

    expect(relations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        kind: 'inherit',
        specifier: 'Worker',
        fromSymbolId: '/workspace/console.cpp:class:ConsoleWorker',
        resolvedPath: '/workspace/worker.hpp',
      }),
      expect.objectContaining({
        kind: 'overrides',
        specifier: 'execute',
        fromSymbolId: '/workspace/console.cpp:class:ConsoleWorker',
        toSymbolId: '/workspace/worker.hpp:method:Worker::execute',
        resolvedPath: '/workspace/worker.hpp',
      }),
    ]));
  });

  it('walks transitive quoted includes in order while ignoring missing and repeated paths', async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'codegraphy-cpp-includes-'));
    tempRoots.push(workspaceRoot);
    const first = path.join(workspaceRoot, 'include/first.hpp');
    const second = path.join(workspaceRoot, 'include/second.hpp');
    const empty = path.join(workspaceRoot, 'include/empty.hpp');
    await fs.mkdir(path.dirname(first), { recursive: true });
    await fs.writeFile(first, '#include "second.hpp"\n#include "missing.hpp"\n', 'utf8');
    await fs.writeFile(second, '#include "first.hpp"\n', 'utf8');
    await fs.writeFile(empty, 'int count;\n', 'utf8');

    expect(readInitialIncludedPaths([
      { kind: 'include', resolvedPath: first } as IAnalysisRelation,
      { kind: 'import', resolvedPath: second } as IAnalysisRelation,
      { kind: 'include', resolvedPath: null } as IAnalysisRelation,
    ])).toEqual([first]);
    expect(readTransitiveIncludedPaths([first], workspaceRoot)).toEqual([first, second]);
    expect(readTransitiveIncludedPaths([empty], workspaceRoot)).toEqual([empty]);
    expect(readIncludedCppRootNode(path.join(workspaceRoot, 'missing.hpp'))).toBeNull();
  });
});
