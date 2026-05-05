import { describe, expect, it } from 'vitest';
import {
  getImportClause,
  getNamedImportSpecifiers,
  isImportSpecifierNode,
} from '../../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/typeImports/clause';
import { importClause, importSpecifier, namedImports, node } from './fixtures';

describe('extension/pipeline/treesitter/javascript/typeImports/clause', () => {
  it('finds the actual import clause among statement children', () => {
    const clause = importClause([]);

    expect(getImportClause(node({
      type: 'import_statement',
      namedChildren: [
        node({ type: 'not_import_clause' }),
        clause,
      ],
    }))).toBe(clause);
  });

  it('returns no named import specifiers without an import clause or named imports node', () => {
    expect(getNamedImportSpecifiers(undefined)).toEqual([]);
    expect(getNamedImportSpecifiers(importClause([
      node({ type: 'not_named_imports' }),
    ]))).toEqual([]);
  });

  it('returns only import specifiers from named imports', () => {
    const specifier = importSpecifier({
      text: 'RuntimeOptions',
      namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
    });

    expect(isImportSpecifierNode(specifier)).toBe(true);
    expect(isImportSpecifierNode(node({ type: 'not_import_specifier' }))).toBe(false);
    expect(getNamedImportSpecifiers(importClause([
      node({
        type: 'not_named_imports',
        namedChildren: [specifier],
      }),
      namedImports([]),
    ]))).toEqual([]);

    expect(getNamedImportSpecifiers(importClause([
      namedImports([
        node({
          type: 'not_import_specifier',
          children: [node({ type: 'type' })],
        }),
        specifier,
      ]),
    ]))).toEqual([specifier]);
  });
});
