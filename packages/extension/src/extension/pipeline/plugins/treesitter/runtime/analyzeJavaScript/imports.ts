import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '../../../../../../core/plugins/types/contracts';
import { TREE_SITTER_SOURCE_IDS } from '../languages';
import { resolveTreeSitterImportPath } from '../resolve';
import { collectImportBindings } from '../analyze/imports';
import type { ImportedBinding, SymbolWalkState, TreeWalkAction } from '../analyze/model';
import { getStringSpecifier } from '../analyze/nodes';
import { addImportRelation, addRelation, addTypeImportRelation } from '../analyze/results';
import { collectTypeImportBindings } from './typeImports/collect';
import { hasDirectTypeKeyword, hasTypeSpecifierImport } from './typeImports/markers';

type ImportStatementContext = {
  filePath: string;
  importedBindings: Map<string, ImportedBinding>;
  node: Parser.SyntaxNode;
  relations: IAnalysisRelation[];
  resolvedPath: string | null;
  specifier: string;
};

function getImportClause(node: Parser.SyntaxNode): Parser.SyntaxNode | undefined {
  return (node.namedChildren ?? []).find((child) => child.type === 'import_clause');
}

function isValueImportSpecifier(node: Parser.SyntaxNode): boolean {
  return node.type === 'import_specifier'
    && !(node.children ?? []).some((child) => child.type === 'type');
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

function addValueImportRelations(context: ImportStatementContext): void {
  const statementBindings = collectImportBindings(
    context.node,
    context.specifier,
    context.resolvedPath,
    context.importedBindings,
  );

  if (statementBindings.length === 0) {
    addImportRelation(context.relations, context.filePath, context.specifier, context.resolvedPath);
    return;
  }

  for (const binding of statementBindings) {
    addImportRelation(
      context.relations,
      context.filePath,
      context.specifier,
      context.resolvedPath,
      undefined,
      undefined,
      binding,
    );
  }
}

function addTypeImportRelations(context: ImportStatementContext): void {
  const typeBindings = collectTypeImportBindings(context.node, context.specifier, context.resolvedPath);
  if (typeBindings.length === 0) {
    addTypeImportRelation(context.relations, context.filePath, context.specifier, context.resolvedPath);
    return;
  }

  for (const binding of typeBindings) {
    addTypeImportRelation(context.relations, context.filePath, context.specifier, context.resolvedPath, binding);
  }
}

export function handleJavaScriptImportStatement(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  importedBindings: Map<string, ImportedBinding>,
): TreeWalkAction<SymbolWalkState> {
  const specifier = getStringSpecifier(node.namedChildren.find((child) => child.type === 'string'));
  if (!specifier) {
    return { skipChildren: true };
  }

  const context = {
    filePath,
    importedBindings,
    node,
    relations,
    resolvedPath: resolveTreeSitterImportPath(filePath, specifier),
    specifier,
  };

  if (hasValueImport(node)) {
    addValueImportRelations(context);
  }

  if (hasDirectTypeKeyword(node) || hasTypeSpecifierImport(node)) {
    addTypeImportRelations(context);
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
