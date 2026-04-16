import type Parser from 'tree-sitter';
import { describe, expect, it } from 'vitest';
import {
  createEmptyCSharpIndex,
  indexCSharpTree,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';
import { createCSharpNode } from './fixtures';

describe('pipeline/plugins/treesitter/runtime/csharpIndex/indexTree', () => {
  it('indexes file-scoped and block-scoped namespaces into qualified names', () => {
    const index = createEmptyCSharpIndex();
    const tree = {
      rootNode: createCSharpNode({
        type: 'compilation_unit',
        children: [
          createCSharpNode({
            type: 'file_scoped_namespace_declaration',
            fields: {
              name: createCSharpNode({ type: 'qualified_name', text: 'MyApp' }),
            },
            children: [
              createCSharpNode({
                type: 'class_declaration',
                fields: {
                  name: createCSharpNode({ type: 'identifier', text: 'Program' }),
                },
              }),
            ],
          }),
          createCSharpNode({
            type: 'namespace_declaration',
            fields: {
              name: createCSharpNode({ type: 'qualified_name', text: 'MyApp.Services' }),
            },
            children: [
              createCSharpNode({
                type: 'class_declaration',
                fields: {
                  name: createCSharpNode({ type: 'identifier', text: 'ApiService' }),
                },
              }),
            ],
          }),
        ],
      }),
    } as Parser.Tree;

    indexCSharpTree(tree, '/workspace/src/Program.cs', index);

    expect(index.typesByQualifiedName.get('MyApp.Program')?.filePath).toBe(
      '/workspace/src/Program.cs',
    );
    expect(index.typesByQualifiedName.get('MyApp.Services.ApiService')?.filePath).toBe(
      '/workspace/src/Program.cs',
    );
  });

  it('indexes top-level types without a namespace qualifier', () => {
    const index = createEmptyCSharpIndex();
    const tree = {
      rootNode: createCSharpNode({
        type: 'compilation_unit',
        children: [
          createCSharpNode({
            type: 'struct_declaration',
            fields: {
              name: createCSharpNode({ type: 'identifier', text: 'Point' }),
            },
          }),
        ],
      }),
    } as Parser.Tree;

    indexCSharpTree(tree, '/workspace/src/Point.cs', index);

    expect(index.typesByQualifiedName.get('Point')).toEqual({
      filePath: '/workspace/src/Point.cs',
      namespaceName: null,
      typeName: 'Point',
    });
  });

  it('inherits the current namespace when a namespace node has no readable name', () => {
    const index = createEmptyCSharpIndex();
    const tree = {
      rootNode: createCSharpNode({
        type: 'compilation_unit',
        children: [
          createCSharpNode({
            type: 'file_scoped_namespace_declaration',
            fields: {
              name: createCSharpNode({ type: 'qualified_name', text: 'MyApp' }),
            },
            children: [
              createCSharpNode({
                type: 'namespace_declaration',
                children: [
                  createCSharpNode({
                    type: 'interface_declaration',
                    fields: {
                      name: createCSharpNode({ type: 'identifier', text: 'Runnable' }),
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    } as Parser.Tree;

    indexCSharpTree(tree, '/workspace/src/Program.cs', index);

    expect(index.typesByQualifiedName.get('MyApp.Runnable')).toEqual({
      filePath: '/workspace/src/Program.cs',
      namespaceName: 'MyApp',
      typeName: 'Runnable',
    });
  });

  it('does not treat enclosing type declarations as namespace scopes for nested types', () => {
    const index = createEmptyCSharpIndex();
    const tree = {
      rootNode: createCSharpNode({
        type: 'compilation_unit',
        children: [
          createCSharpNode({
            type: 'namespace_declaration',
            fields: {
              name: createCSharpNode({ type: 'qualified_name', text: 'MyApp' }),
            },
            children: [
              createCSharpNode({
                type: 'class_declaration',
                fields: {
                  name: createCSharpNode({ type: 'identifier', text: 'Container' }),
                },
                children: [
                  createCSharpNode({
                    type: 'struct_declaration',
                    fields: {
                      name: createCSharpNode({ type: 'identifier', text: 'Nested' }),
                    },
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    } as Parser.Tree;

    indexCSharpTree(tree, '/workspace/src/Program.cs', index);

    expect(index.typesByQualifiedName.get('MyApp.Container')).toEqual({
      filePath: '/workspace/src/Program.cs',
      namespaceName: 'MyApp',
      typeName: 'Container',
    });
    expect(index.typesByQualifiedName.get('MyApp.Nested')).toEqual({
      filePath: '/workspace/src/Program.cs',
      namespaceName: 'MyApp',
      typeName: 'Nested',
    });
    expect(index.typesByQualifiedName.has('Container.Nested')).toBe(false);
  });

  it('ignores non-type nodes and type declarations without a readable name', () => {
    const index = createEmptyCSharpIndex();
    const tree = {
      rootNode: createCSharpNode({
        type: 'compilation_unit',
        children: [
          createCSharpNode({
            type: 'method_declaration',
            fields: {
              name: createCSharpNode({ type: 'identifier', text: 'Run' }),
            },
          }),
          createCSharpNode({
            type: 'class_declaration',
          }),
        ],
      }),
    } as Parser.Tree;

    indexCSharpTree(tree, '/workspace/src/Program.cs', index);

    expect(index.typesByQualifiedName.size).toBe(0);
  });
});
