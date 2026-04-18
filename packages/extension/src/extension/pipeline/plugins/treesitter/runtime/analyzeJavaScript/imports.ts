import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import { resolveTreeSitterImportPath } from '../resolve';
import { collectImportBindings } from '../analyze/imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getStringSpecifier } from '../analyze/nodes';
import { addImportRelation, addRelation, addTypeImportRelation } from '../analyze/results';

function hasDirectTypeKeyword(node: Parser.SyntaxNode): boolean {
  return (node.children ?? []).some((child) => child.type === 'type');
}

function isTypeImportSpecifier(node: Parser.SyntaxNode): boolean {
  return node.type === 'import_specifier' && node.text.trimStart().startsWith('type ');
}

function getImportClause(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  return (node.namedChildren ?? []).find((child) => child.type === 'import_clause');
}

function getNamedImportSpecifiers(importClause: Parser.SyntaxNode | undefined): Parser.SyntaxNode[] {
  const namedImports = importClause?.namedChildren.find((child) => child.type === 'named_imports');
  return namedImports?.namedChildren.filter((child) => child.type === 'import_specifier') ?? [];
}

function hasTypeSpecifierImport(node: Parser.SyntaxNode): boolean {
  return getNamedImportSpecifiers(getImportClause(node)).some(isTypeImportSpecifier);
}

function isValueImportSpecifier(node: Parser.SyntaxNode): boolean {
  return node.type === 'import_specifier' && !isTypeImportSpecifier(node);
}

function isValueImportClauseChild(node: Parser.SyntaxNode): boolean {
  if (node.type === 'identifier' || node.type === 'namespace_import') {
    return true;
  }

  if (node.type !== 'named_imports') {
    return false;
  }

  return (node.namedChildren ?? []).some(isValueImportSpecifier);
}

function hasValueImport(node: Parser.SyntaxNode): boolean {
  if (hasDirectTypeKeyword(node)) {
    return false;
  }

  const importClause = getImportClause(node);
  if (!importClause) {
    return true;
  }

  return (importClause.namedChildren ?? []).some(isValueImportClauseChild);
}

export function handleJavaScriptImportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
  if (specifier) {
    const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
    if (hasValueImport(node)) {
      collectImportBindings(node, specifier, resolvedPath, importedBindings);
      addImportRelation(relations, filePath, specifier, resolvedPath);
    }
    if (hasDirectTypeKeyword(node) || hasTypeSpecifierImport(node)) {
      addTypeImportRelation(relations, filePath, specifier, resolvedPath);
    }
  }

  return { skipChildren: true };
}

export function handleJavaScriptExportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
): void {
  const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
  if (!specifier) {
    return;
  }

  const resolvedPath = resolveTreeSitterImportPath(filePath, specifier);
  addRelation(relations, {
    kind: 'reexport',
    sourceId: TREE_SITTER_SOURCE_IDS.reexport,
    fromFilePath: filePath,
    specifier,
    resolvedPath,
    toFilePath: resolvedPath,
  });
}
