import { describe, expect, it } from 'vitest';
import {
  getImportClause,
  isValueImportClauseChild,
} from '../../../src/treeSitter/runtime/analyzeJavaScript/importClause';

function node(type: string, children: unknown[] = [], namedChildren: unknown[] = children): never {
  return {
    type,
    children,
    namedChildren,
  } as never;
}

function sparseNode(type: string, shape: {
  children?: unknown[];
  namedChildren?: unknown[];
} = {}): never {
  return {
    type,
    ...shape,
  } as never;
}

describe('treeSitter/javascript/importClause', () => {
  it('finds import clauses among named children', () => {
    const clause = node('import_clause');

    expect(getImportClause(node('import_statement', [
      node('import'),
      clause,
      node('string'),
    ]))).toBe(clause);
    expect(getImportClause(node('import_statement', [node('string')]))).toBeUndefined();
    expect(getImportClause({} as never)).toBeUndefined();
    expect(getImportClause(sparseNode('import_statement'))).toBeUndefined();
  });

  it('recognizes default, namespace, and named value imports', () => {
    expect(isValueImportClauseChild(node('identifier'))).toBe(true);
    expect(isValueImportClauseChild(node('namespace_import'))).toBe(true);
    expect(isValueImportClauseChild(node('named_imports', [
      node('import_specifier', [node('identifier')]),
      node('import_specifier', [node('type'), node('identifier')]),
    ]))).toBe(true);
  });

  it('rejects non-import children and type-only named imports', () => {
    expect(isValueImportClauseChild(node('string'))).toBe(false);
    expect(isValueImportClauseChild(sparseNode('not_import_specifier', {
      children: [node('identifier')],
    }))).toBe(false);
    expect(isValueImportClauseChild(sparseNode('string', {
      namedChildren: [
        node('import_specifier', [node('identifier')]),
      ],
    }))).toBe(false);
    expect(isValueImportClauseChild(node('named_imports', [
      node('import_specifier', [node('type'), node('identifier')]),
    ]))).toBe(false);
    expect(isValueImportClauseChild(node('named_imports'))).toBe(false);
    expect(isValueImportClauseChild(sparseNode('named_imports'))).toBe(false);
  });
});
