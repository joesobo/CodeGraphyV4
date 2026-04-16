import { describe, expect, it } from 'vitest';
import {
  getCSharpFileScopedNamespaceName,
  getCSharpIdentifierText,
  getCSharpNamespaceName,
  getCSharpNodeText,
  isCSharpTypeDeclarationNode,
} from '../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex';
import { createCSharpNode } from './fixtures';

describe('pipeline/plugins/treesitter/runtime/csharpIndex/nodes', () => {
  it('reads identifier text from identifier and type_identifier nodes', () => {
    expect(getCSharpIdentifierText(createCSharpNode({ type: 'identifier', text: 'ApiService' })))
      .toBe('ApiService');
    expect(
      getCSharpIdentifierText(createCSharpNode({ type: 'type_identifier', text: 'ApiService' })),
    ).toBe('ApiService');
    expect(getCSharpIdentifierText(createCSharpNode({ type: 'qualified_name', text: 'A.B' })))
      .toBeNull();
  });

  it('reads node text from qualified node shapes', () => {
    expect(getCSharpNodeText(createCSharpNode({ type: 'qualified_name', text: 'A.B' })))
      .toBe('A.B');
    expect(getCSharpNodeText(createCSharpNode({ type: 'generic_name', text: 'List<T>' })))
      .toBe('List<T>');
  });

  it('resolves namespace names from field names and fallback children', () => {
    const fieldNode = createCSharpNode({ type: 'qualified_name', text: 'MyApp.Services' });
    const fieldDeclaration = createCSharpNode({
      type: 'namespace_declaration',
      fields: { name: fieldNode },
    });
    const fallbackDeclaration = createCSharpNode({
      type: 'namespace_declaration',
      children: [createCSharpNode({ type: 'qualified_name', text: 'MyApp.Tools' })],
    });

    expect(getCSharpNamespaceName(fieldDeclaration)).toBe('MyApp.Services');
    expect(getCSharpNamespaceName(fallbackDeclaration)).toBe('MyApp.Tools');
  });

  it('finds the file-scoped namespace declaration at the root', () => {
    const rootNode = createCSharpNode({
      type: 'compilation_unit',
      children: [
        createCSharpNode({
          type: 'file_scoped_namespace_declaration',
          fields: {
            name: createCSharpNode({ type: 'qualified_name', text: 'MyApp.Services' }),
          },
        }),
      ],
    });

    expect(getCSharpFileScopedNamespaceName(rootNode)).toBe('MyApp.Services');
  });

  it('recognizes supported C# type declaration nodes', () => {
    expect(isCSharpTypeDeclarationNode(createCSharpNode({ type: 'class_declaration' }))).toBe(
      true,
    );
    expect(isCSharpTypeDeclarationNode(createCSharpNode({ type: 'enum_declaration' }))).toBe(
      true,
    );
    expect(isCSharpTypeDeclarationNode(createCSharpNode({ type: 'interface_declaration' }))).toBe(
      true,
    );
    expect(isCSharpTypeDeclarationNode(createCSharpNode({ type: 'struct_declaration' }))).toBe(
      true,
    );
    expect(isCSharpTypeDeclarationNode(createCSharpNode({ type: 'method_declaration' }))).toBe(
      false,
    );
  });
});
