import type Parser from 'tree-sitter';

export function getImportClause(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  return (node.namedChildren ?? []).find((child) => child.type === 'import_clause');
}

function isValueImportSpecifier(node: Parser.SyntaxNode): boolean {
  return node.type === 'import_specifier'
    && !(node.children ?? []).some((child) => child.type === 'type');
}

export function isValueImportClauseChild(node: Parser.SyntaxNode): boolean {
  if (node.type === 'identifier' || node.type === 'namespace_import') {
    return true;
  }

  if (node.type !== 'named_imports') {
    return false;
  }

  return (node.namedChildren ?? []).some(isValueImportSpecifier);
}
