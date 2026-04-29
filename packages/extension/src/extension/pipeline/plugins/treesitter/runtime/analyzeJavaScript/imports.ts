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
  return node.type === 'import_specifier' && (node.children ?? []).some((child) => child.type === 'type');
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

function collectTypeImportBindings(
  statement: Parser.SyntaxNode,
  specifier: string,
  resolvedPath: string | null,
): ImportedBinding[] {
  const importClause = getImportClause(statement);
  if (!importClause) {
    return [];
  }

  const directTypeImport = hasDirectTypeKeyword(statement);
  const bindings: ImportedBinding[] = [];
  for (const child of importClause.namedChildren ?? []) {
    if (child.type === 'identifier' && directTypeImport) {
      bindings.push({
        bindingKind: 'default',
        importedName: 'default',
        localName: child.text,
        resolvedPath,
        specifier,
      });
      continue;
    }

    if (child.type === 'namespace_import' && directTypeImport) {
      const localName = (child.namedChildren ?? []).find((namedChild) => namedChild.type === 'identifier')?.text;
      if (localName) {
        bindings.push({
          bindingKind: 'namespace',
          importedName: '*',
          localName,
          resolvedPath,
          specifier,
        });
      }
      continue;
    }

    if (child.type !== 'named_imports') {
      continue;
    }

    for (const importSpecifier of child.namedChildren.filter((namedChild) => namedChild.type === 'import_specifier')) {
      if (!directTypeImport && !isTypeImportSpecifier(importSpecifier)) {
        continue;
      }

      const identifiers = importSpecifier.namedChildren.filter((namedChild) =>
        namedChild.type === 'identifier' || namedChild.type === 'type_identifier',
      );
      const importedName = identifiers[0]?.text;
      const localName = identifiers.at(-1)?.text;
      if (!localName) {
        continue;
      }

      bindings.push({
        bindingKind: 'named',
        importedName: importedName ?? localName,
        localName,
        resolvedPath,
        specifier,
      });
    }
  }

  return bindings;
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
      const statementBindings = collectImportBindings(node, specifier, resolvedPath, importedBindings);
      if (statementBindings.length === 0) {
        addImportRelation(relations, filePath, specifier, resolvedPath);
      } else {
        for (const binding of statementBindings) {
          addImportRelation(relations, filePath, specifier, resolvedPath, undefined, undefined, binding);
        }
      }
    }
    if (hasDirectTypeKeyword(node) || hasTypeSpecifierImport(node)) {
      const typeBindings = collectTypeImportBindings(node, specifier, resolvedPath);
      if (typeBindings.length === 0) {
        addTypeImportRelation(relations, filePath, specifier, resolvedPath);
      } else {
        for (const binding of typeBindings) {
          addTypeImportRelation(relations, filePath, specifier, resolvedPath, binding);
        }
      }
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
