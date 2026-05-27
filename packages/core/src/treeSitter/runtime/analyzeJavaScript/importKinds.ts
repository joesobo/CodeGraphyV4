import type Parser from 'tree-sitter';
import { getImportClause, isValueImportClauseChild } from './importClause';
import { hasDirectTypeKeyword } from './typeImports/markers';

export function hasValueImport(node: Parser.SyntaxNode): boolean {
  if (hasDirectTypeKeyword(node)) {
    return false;
  }

  const importClause = getImportClause(node);
  if (!importClause) {
    return true;
  }

  return (importClause.namedChildren ?? []).some(isValueImportClauseChild);
}
