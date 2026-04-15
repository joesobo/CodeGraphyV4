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
});
