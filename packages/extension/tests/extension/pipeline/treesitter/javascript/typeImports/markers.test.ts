import { describe, expect, it } from 'vitest';
import {
  hasDirectTypeKeyword,
  hasTypeSpecifierImport,
} from '../../../../../../src/extension/pipeline/plugins/treesitter/runtime/analyzeJavaScript/typeImports/markers';
import { importClause, importSpecifier, importStatement, namedImports, node } from './fixtures';

describe('extension/pipeline/treesitter/javascript/typeImports/markers', () => {
  it('detects top-level and inline type import markers', () => {
    const inlineTypeImport = importStatement(importClause([
      namedImports([
        importSpecifier({
          text: 'type RuntimeOptions',
          children: [node({ type: 'type' }), node({ type: 'identifier', text: 'RuntimeOptions' })],
          namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
        }),
      ]),
    ]));

    expect(hasDirectTypeKeyword(importStatement(undefined, [node({ type: 'import' }), node({ type: 'type' })]))).toBe(true);
    expect(hasDirectTypeKeyword(inlineTypeImport)).toBe(false);
    expect(hasTypeSpecifierImport(inlineTypeImport)).toBe(true);
  });

  it('rejects value imports and malformed type markers', () => {
    const valueImport = importStatement(importClause([
      namedImports([
        importSpecifier({
          text: 'RuntimeOptions',
          children: [node({ type: 'identifier', text: 'RuntimeOptions' })],
          namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
        }),
      ]),
    ]));
    const malformedTypeMarker = importStatement(importClause([
      namedImports([
        node({
          type: 'not_import_specifier',
          children: [node({ type: 'type' })],
          namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
        }),
      ]),
    ]));

    expect(hasDirectTypeKeyword(importStatement(undefined, [
      node({ type: 'import' }),
      node({ type: 'identifier', text: 'RuntimeOptions' }),
    ]))).toBe(false);
    expect(hasDirectTypeKeyword(valueImport)).toBe(false);
    expect(hasTypeSpecifierImport(valueImport)).toBe(false);
    expect(hasTypeSpecifierImport(malformedTypeMarker)).toBe(false);
    expect(hasTypeSpecifierImport(importStatement())).toBe(false);
  });

  it('requires the actual import clause and named imports nodes', () => {
    const typeSpecifier = importSpecifier({
      text: 'type RuntimeOptions',
      children: [node({ type: 'type' }), node({ type: 'identifier', text: 'RuntimeOptions' })],
      namedChildren: [node({ type: 'identifier', text: 'RuntimeOptions' })],
    });

    expect(hasTypeSpecifierImport(node({
      type: 'import_statement',
      namedChildren: [
        node({
          type: 'not_import_clause',
          namedChildren: [namedImports([typeSpecifier])],
        }),
        importClause([namedImports([])]),
      ],
    }))).toBe(false);

    expect(hasTypeSpecifierImport(importStatement(importClause([
      node({
        type: 'not_named_imports',
        namedChildren: [typeSpecifier],
      }),
    ])))).toBe(false);
  });
});
