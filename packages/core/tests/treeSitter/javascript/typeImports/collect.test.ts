import { describe, expect, it } from 'vitest';
import { collectTypeImportBindings } from '../../../../src/treeSitter/runtime/analyzeJavaScript/typeImports/collect';
import { importClause, importSpecifier, importStatement, namedImports, node } from './fixtures';

describe('extension/pipeline/treesitter/javascript/typeImports/collect', () => {
  it('returns no bindings when an import statement has no import clause', () => {
    expect(collectTypeImportBindings(
      importStatement(),
      './types',
      '/workspace/src/types.ts',
    )).toEqual([]);
  });

  it('collects default and namespace bindings from a top-level type import', () => {
    expect(collectTypeImportBindings(
      importStatement(
        importClause([
          node({ type: 'identifier', text: 'PluginContract' }),
          node({
            type: 'namespace_import',
            namedChildren: [node({ type: 'identifier', text: 'Contracts' })],
          }),
        ]),
        [node({ type: 'import' }), node({ type: 'type' })],
      ),
      '@codegraphy-dev/plugin-api',
      '/workspace/packages/plugin-api/src/index.ts',
    )).toEqual([
      {
        bindingKind: 'default',
        importedName: 'default',
        localName: 'PluginContract',
        resolvedPath: '/workspace/packages/plugin-api/src/index.ts',
        specifier: '@codegraphy-dev/plugin-api',
      },
      {
        bindingKind: 'namespace',
        importedName: '*',
        localName: 'Contracts',
        resolvedPath: '/workspace/packages/plugin-api/src/index.ts',
        specifier: '@codegraphy-dev/plugin-api',
      },
    ]);
  });

  it('ignores malformed default and namespace type import children', () => {
    expect(collectTypeImportBindings(
      importStatement(
        importClause([
          node({
            type: 'namespace_import',
            namedChildren: [node({ type: 'string', text: 'Contracts' })],
          }),
          node({ type: 'string', text: 'not-a-default-binding' }),
        ]),
        [node({ type: 'import' }), node({ type: 'type' })],
      ),
      './types',
      '/workspace/src/types.ts',
    )).toEqual([]);
  });

  it('collects named and aliased bindings from top-level type imports', () => {
    expect(collectTypeImportBindings(
      importStatement(
        importClause([
          namedImports([
            importSpecifier({
              text: 'PluginContract',
              namedChildren: [node({ type: 'identifier', text: 'PluginContract' })],
            }),
            importSpecifier({
              text: 'RuntimeOptions as Options',
              namedChildren: [
                node({ type: 'type_identifier', text: 'RuntimeOptions' }),
                node({ type: 'identifier', text: 'Options' }),
              ],
            }),
          ]),
        ]),
        [node({ type: 'import' }), node({ type: 'type' })],
      ),
      './types',
      '/workspace/src/types.ts',
    )).toEqual([
      {
        bindingKind: 'named',
        importedName: 'PluginContract',
        localName: 'PluginContract',
        resolvedPath: '/workspace/src/types.ts',
        specifier: './types',
      },
      {
        bindingKind: 'named',
        importedName: 'RuntimeOptions',
        localName: 'Options',
        resolvedPath: '/workspace/src/types.ts',
        specifier: './types',
      },
    ]);
  });

  it('ignores malformed named type import specifiers', () => {
    expect(collectTypeImportBindings(
      importStatement(
        importClause([
          namedImports([
            node({
              type: 'not_import_specifier',
              namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
            }),
            importSpecifier({
              text: 'type',
              children: [node({ type: 'type' })],
              namedChildren: [node({ type: 'string', text: 'RuntimeOptions' })],
            }),
          ]),
        ]),
        [node({ type: 'import' }), node({ type: 'type' })],
      ),
      './types',
      '/workspace/src/types.ts',
    )).toEqual([]);
  });

  it('ignores unsupported import clause children even when they contain specifiers', () => {
    expect(collectTypeImportBindings(
      importStatement(
        importClause([
          node({
            type: 'not_named_imports',
            namedChildren: [
              importSpecifier({
                text: 'RuntimeOptions',
                namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
              }),
            ],
          }),
        ]),
        [node({ type: 'import' }), node({ type: 'type' })],
      ),
      './types',
      '/workspace/src/types.ts',
    )).toEqual([]);
  });

  it('collects inline type specifiers without collecting value specifiers', () => {
    expect(collectTypeImportBindings(
      importStatement(importClause([
        namedImports([
          importSpecifier({
            text: 'type RuntimeOptions',
            children: [node({ type: 'type' }), node({ type: 'identifier', text: 'RuntimeOptions' })],
            namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
          }),
          importSpecifier({
            text: 'boot',
            namedChildren: [node({ type: 'identifier', text: 'boot' })],
          }),
        ]),
      ])),
      './runtime',
      '/workspace/src/runtime.ts',
    )).toEqual([
      {
        bindingKind: 'named',
        importedName: 'RuntimeOptions',
        localName: 'RuntimeOptions',
        resolvedPath: '/workspace/src/runtime.ts',
        specifier: './runtime',
      },
    ]);
  });
});
