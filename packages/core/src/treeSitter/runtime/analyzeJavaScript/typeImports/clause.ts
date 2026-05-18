import type Parser from 'tree-sitter';

function namedChildrenOf(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return node.namedChildren;
}

export function getImportClause(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  return namedChildrenOf(node).find((child) => child.type === 'import_clause');
}

export function isImportSpecifierNode(node: Parser.SyntaxNode): boolean {
  return node.type === 'import_specifier';
}

export function getNamedImportSpecifiers(importClause: Parser.SyntaxNode | undefined): Parser.SyntaxNode[] {
  if (!importClause) {
    return [];
  }

  const namedImports = namedChildrenOf(importClause).find((child) => child.type === 'named_imports');
  if (!namedImports) {
    return [];
  }

  return namedChildrenOf(namedImports).filter(isImportSpecifierNode);
}
