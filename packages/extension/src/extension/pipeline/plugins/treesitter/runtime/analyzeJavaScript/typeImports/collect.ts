import type Parser from 'tree-sitter';
import type { ImportedBinding } from '../../analyze/model';
import {
  collectNamespaceTypeBinding,
  createDefaultTypeBinding,
  createNamedTypeBinding,
  isImportedBinding,
} from './binding';
import {
  getImportClause,
  isImportSpecifierNode,
} from './clause';
import {
  hasDirectTypeKeyword,
  isTypeImportSpecifier,
} from './markers';
import type { TypeImportContext } from './model';

function collectNamedTypeBindings(
  namedImports: Parser.SyntaxNode,
  directTypeImport: boolean,
  context: TypeImportContext,
): ImportedBinding[] {
  return namedImports.namedChildren
    .filter(isImportSpecifierNode)
    .filter((importSpecifier) => directTypeImport || isTypeImportSpecifier(importSpecifier))
    .map((importSpecifier) => createNamedTypeBinding(importSpecifier, context))
    .filter(isImportedBinding);
}

function collectTypeImportClauseChild(
  child: Parser.SyntaxNode,
  directTypeImport: boolean,
  context: TypeImportContext,
): ImportedBinding[] {
  if (directTypeImport && child.type === 'identifier') {
    return [createDefaultTypeBinding(child, context)];
  }

  if (directTypeImport && child.type === 'namespace_import') {
    return collectNamespaceTypeBinding(child, context);
  }

  if (child.type === 'named_imports') {
    return collectNamedTypeBindings(child, directTypeImport, context);
  }

  return [];
}

export function collectTypeImportBindings(
  statement: Parser.SyntaxNode,
  specifier: string,
  resolvedPath: string | null,
): ImportedBinding[] {
  const importClause = getImportClause(statement);
  if (!importClause) {
    return [];
  }

  const directTypeImport = hasDirectTypeKeyword(statement);
  const context = { specifier, resolvedPath };
  return importClause.namedChildren.flatMap((child) =>
    collectTypeImportClauseChild(child, directTypeImport, context),
  );
}
