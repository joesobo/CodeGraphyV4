import { describe, expect, it } from 'vitest';
import {
  collectNamespaceTypeBinding,
  createDefaultTypeBinding,
  createNamedTypeBinding,
  isImportedBinding,
} from '../../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/typeImports/binding';
import { importSpecifier, node } from './fixtures';

const context = {
  resolvedPath: '/workspace/src/types.ts',
  specifier: './types',
};

describe('extension/pipeline/treesitter/javascript/typeImports/binding', () => {
  it('creates default bindings from direct type import identifiers', () => {
    expect(createDefaultTypeBinding(node({ type: 'identifier', text: 'PluginContract' }), context)).toEqual({
      bindingKind: 'default',
      importedName: 'default',
      localName: 'PluginContract',
      resolvedPath: '/workspace/src/types.ts',
      specifier: './types',
    });
  });

  it('collects namespace bindings only when the namespace has a local identifier', () => {
    expect(collectNamespaceTypeBinding(
      node({
        type: 'namespace_import',
        namedChildren: [node({ type: 'identifier', text: 'Contracts' })],
      }),
      context,
    )).toEqual([{
      bindingKind: 'namespace',
      importedName: '*',
      localName: 'Contracts',
      resolvedPath: '/workspace/src/types.ts',
      specifier: './types',
    }]);

    expect(collectNamespaceTypeBinding(
      node({
        type: 'namespace_import',
        namedChildren: [node({ type: 'string', text: 'Contracts' })],
      }),
      context,
    )).toEqual([]);
  });

  it('creates named bindings from identifiers and type identifiers', () => {
    expect(createNamedTypeBinding(
      importSpecifier({
        text: 'RuntimeOptions as Options',
        namedChildren: [
          node({ type: 'type_identifier', text: 'RuntimeOptions' }),
          node({ type: 'identifier', text: 'Options' }),
        ],
      }),
      context,
    )).toEqual({
      bindingKind: 'named',
      importedName: 'RuntimeOptions',
      localName: 'Options',
      resolvedPath: '/workspace/src/types.ts',
      specifier: './types',
    });

    expect(createNamedTypeBinding(
      importSpecifier({
        text: 'RuntimeOptions as Intermediate as Options',
        namedChildren: [
          node({ type: 'type_identifier', text: 'RuntimeOptions' }),
          node({ type: 'identifier', text: 'Intermediate' }),
          node({ type: 'identifier', text: 'Options' }),
        ],
      }),
      context,
    )).toMatchObject({
      importedName: 'RuntimeOptions',
      localName: 'Options',
    });
  });

  it('rejects named bindings without local identifiers', () => {
    expect(createNamedTypeBinding(
      importSpecifier({
        text: 'type',
        children: [node({ type: 'type' })],
        namedChildren: [node({ type: 'string', text: 'RuntimeOptions' })],
      }),
      context,
    )).toBeNull();
    expect([createNamedTypeBinding(
      importSpecifier({
        text: 'type',
        children: [node({ type: 'type' })],
        namedChildren: [node({ type: 'string', text: 'RuntimeOptions' })],
      }),
      context,
    )].filter(isImportedBinding)).toEqual([]);
  });

  it('filters null bindings while preserving real imported bindings', () => {
    const binding = createDefaultTypeBinding(node({ type: 'identifier', text: 'PluginContract' }), context);

    expect([binding, null].filter(isImportedBinding)).toEqual([binding]);
  });
});
