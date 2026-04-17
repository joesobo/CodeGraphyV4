import { describe, expect, it } from 'vitest';
import {
  getCSharpFileScopedNamespaceName,
  getCSharpIdentifierText,
  getCSharpNamespaceName,
  getCSharpNodeText,
} from '../../../../../../../../src/extension/pipeline/plugins/treesitter/runtime/csharpIndex/text';
import { createCSharpNode } from '../../../../../treesitter/csharpIndex/fixtures';

describe('pipeline/plugins/treesitter/runtime/csharpIndex/text', () => {
  it('reads identifier text only from identifier node kinds', () => {
    expect(getCSharpIdentifierText(createCSharpNode({ type: 'identifier', text: 'ApiService' })))
      .toBe('ApiService');
    expect(
      getCSharpIdentifierText(createCSharpNode({ type: 'type_identifier', text: 'Program' })),
    ).toBe('Program');
    expect(getCSharpIdentifierText(createCSharpNode({ type: 'qualified_name', text: 'A.B' })))
      .toBeNull();
    expect(getCSharpIdentifierText(null)).toBeNull();
  });

  it('reads node text from identifier and qualified node shapes', () => {
    expect(getCSharpNodeText(createCSharpNode({ type: 'identifier', text: 'Program' }))).toBe(
      'Program',
    );
    expect(
      getCSharpNodeText(createCSharpNode({ type: 'alias_qualified_name', text: 'global::A.B' })),
    ).toBe('global::A.B');
    expect(getCSharpNodeText(createCSharpNode({ type: 'generic_name', text: 'List<T>' }))).toBe(
      'List<T>',
    );
    expect(getCSharpNodeText(createCSharpNode({ type: 'qualified_name', text: 'A.B' }))).toBe(
      'A.B',
    );
    expect(getCSharpNodeText(createCSharpNode({ type: 'namespace_declaration' }))).toBeNull();
    expect(getCSharpNodeText(undefined)).toBeNull();
  });

  it('prefers the declaration name field and falls back to matching named children', () => {
    const fieldDeclaration = createCSharpNode({
      type: 'namespace_declaration',
      fields: {
        name: createCSharpNode({ type: 'qualified_name', text: 'MyApp.Services' }),
      },
      children: [createCSharpNode({ type: 'identifier', text: 'IgnoredChild' })],
    });
    const fallbackDeclaration = createCSharpNode({
      type: 'namespace_declaration',
      children: [
        createCSharpNode({ type: 'method_declaration', text: 'IgnoreMe' }),
        createCSharpNode({ type: 'alias_qualified_name', text: 'global::MyApp.Tools' }),
      ],
    });

    expect(getCSharpNamespaceName(fieldDeclaration)).toBe('MyApp.Services');
    expect(getCSharpNamespaceName(fallbackDeclaration)).toBe('global::MyApp.Tools');
  });

  it('returns null when a namespace declaration has no readable name', () => {
    const declaration = createCSharpNode({
      type: 'namespace_declaration',
      children: [createCSharpNode({ type: 'method_declaration', text: 'IgnoreMe' })],
    });

    expect(getCSharpNamespaceName(declaration)).toBeNull();
  });

  it('finds the first file-scoped namespace declaration at the root', () => {
    const rootNode = createCSharpNode({
      type: 'compilation_unit',
      children: [
        createCSharpNode({ type: 'namespace_declaration' }),
        createCSharpNode({
          type: 'file_scoped_namespace_declaration',
          fields: {
            name: createCSharpNode({ type: 'qualified_name', text: 'MyApp.Services' }),
          },
        }),
      ],
    });

    expect(getCSharpFileScopedNamespaceName(rootNode)).toBe('MyApp.Services');
    expect(getCSharpFileScopedNamespaceName(createCSharpNode({ type: 'compilation_unit' }))).toBeNull();
  });
});
