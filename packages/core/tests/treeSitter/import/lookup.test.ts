import { describe, expect, it } from 'vitest';
import type Parser from 'tree-sitter';
import type { ImportedBinding } from '../../../src/treeSitter/runtime/analyze/model';
import {
  getImportedBindingByIdentifier,
  getImportedBindingByPropertyAccess,
} from '../../../src/treeSitter/runtime/analyzeImportBinding/lookup';

function node(overrides: Partial<Parser.SyntaxNode>): Parser.SyntaxNode {
  return {
    type: 'identifier',
    text: '',
    namedChildren: [],
    childForFieldName: () => null,
    ...overrides,
  } as unknown as Parser.SyntaxNode;
}

const namespaceBinding: ImportedBinding = {
  localName: 'React',
  importedName: '*',
  specifier: 'react',
  resolvedPath: '/workspace/node_modules/react/index.js',
  bindingKind: 'namespace',
};

describe('treeSitter import binding lookup', () => {
  it('finds bindings by identifier nodes', () => {
    const bindings = new Map([['React', namespaceBinding]]);

    expect(getImportedBindingByIdentifier(node({ text: 'React' }), bindings)).toBe(namespaceBinding);
    expect(getImportedBindingByIdentifier(node({ type: 'string', text: 'React' }), bindings)).toBeNull();
    expect(getImportedBindingByIdentifier(null, bindings)).toBeNull();
  });

  it('resolves namespace property access through named children and field lookups', () => {
    const property = node({ text: 'useMemo' });
    const access = node({
      type: 'member_expression',
      namedChildren: [node({ text: 'React' }), property],
      childForFieldName: (fieldName: string) => fieldName === 'property' ? property : null,
    });
    const bindings = new Map([['React', namespaceBinding]]);

    expect(getImportedBindingByPropertyAccess(
      access,
      bindings,
      'member_expression',
      'object',
      'property',
    )).toEqual({
      ...namespaceBinding,
      importedName: 'useMemo',
      memberName: 'useMemo',
    });
  });

  it('returns the object binding for non-member or unbound property access nodes', () => {
    const bindings = new Map([['React', namespaceBinding]]);
    expect(getImportedBindingByPropertyAccess(
      node({ type: 'identifier', text: 'React' }),
      bindings,
      'member_expression',
      'object',
    )).toBeNull();
    expect(getImportedBindingByPropertyAccess(
      node({ type: 'member_expression', namedChildren: [node({ text: 'Missing' })] }),
      bindings,
      'member_expression',
      'object',
    )).toBeNull();
    expect(getImportedBindingByPropertyAccess(
      node({ type: 'member_expression', namedChildren: [node({ text: 'React' })] }),
      bindings,
      'member_expression',
      'object',
    )).toBe(namespaceBinding);
  });
});
