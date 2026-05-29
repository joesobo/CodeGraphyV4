import { describe, expect, it } from 'vitest';
import {
  getClauseTypeNames,
  getPhpTypeKind,
} from '../../../src/treeSitter/runtime/analyzePhp/typeDeclarations';

function node(type: string, text = '', namedChildren: unknown[] = []): never {
  return {
    type,
    text,
    namedChildren,
  } as never;
}

describe('treeSitter/analyzePhp/typeDeclarations', () => {
  it('maps PHP declaration node types to graph symbol kinds', () => {
    expect(getPhpTypeKind(node('class_declaration'))).toBe('class');
    expect(getPhpTypeKind(node('interface_declaration'))).toBe('interface');
    expect(getPhpTypeKind(node('trait_declaration'))).toBe('trait');
    expect(getPhpTypeKind(node('enum_declaration'))).toBe('enum');
  });

  it('extracts named and qualified names from matching PHP clauses', () => {
    const declaration = node('class_declaration', '', [
      node('base_clause', '', [
        node('name', 'BaseRunner'),
        node('qualified_name', 'App\\Contracts\\Runnable'),
        node('variable_name', '$ignored'),
      ]),
      node('implements_clause', '', [
        node('name', 'Runnable'),
      ]),
    ]);

    expect(getClauseTypeNames(declaration, 'base_clause')).toEqual([
      'BaseRunner',
      'App\\Contracts\\Runnable',
    ]);
    expect(getClauseTypeNames(declaration, 'implements_clause')).toEqual(['Runnable']);
    expect(getClauseTypeNames(declaration, 'trait_clause')).toEqual([]);
  });
});
