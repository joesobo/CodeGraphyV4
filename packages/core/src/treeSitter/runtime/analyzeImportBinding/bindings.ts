import type Parser from 'tree-sitter';
import { applyImportClauseBinding } from './clause';
import type { ImportedBinding } from '../analyze/model';

export function collectImportBindings(
  statement: Parser.SyntaxNode,
  specifier: string,
  resolvedPath: string | null,
  importedBindings: Map<string, ImportedBinding>,
): ImportedBinding[] {
  const importClause = statement.namedChildren.find((child) => child.type === 'import_clause');
  if (!importClause) {
    return [];
  }

  const statementBindings: ImportedBinding[] = [];
  for (const child of importClause.namedChildren) {
    applyImportClauseBinding(child, importedBindings, specifier, resolvedPath, statementBindings);
  }

  return statementBindings;
}
