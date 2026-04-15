import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '../../../../../../core/plugins/types/contracts';
import type { ImportedBinding } from './model';
import { getIdentifierText } from './nodes';
import { createSymbol } from './results';

export function getImportedBindingByIdentifier(
  node: Parser.SyntaxNode | null | undefined,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
): ImportedBinding | null {
  const identifier = getIdentifierText(node);
  return identifier ? importedBindings.get(identifier) ?? null : null;
}

export function getImportedBindingByPropertyAccess(
  node: Parser.SyntaxNode | null | undefined,
  importedBindings: ReadonlyMap<string, ImportedBinding>,
  accessType: string,
  objectFieldName: string,
): ImportedBinding | null {
  if (node?.type !== accessType) {
    return null;
  }

  const objectNode = node.childForFieldName(objectFieldName) ?? node.namedChildren[0];
  return getImportedBindingByIdentifier(objectNode, importedBindings);
}

export function addNamedImportBindings(
  node: Parser.SyntaxNode,
  importedBindings: Map<string, ImportedBinding>,
  specifier: string,
  resolvedPath: string | null,
): void {
  for (const importSpecifier of node.namedChildren.filter((child) => child.type === 'import_specifier')) {
    const identifiers = importSpecifier.namedChildren.filter((child) =>
      child.type === 'identifier' || child.type === 'type_identifier',
    );
    const importedName = identifiers[0]?.text;
    const localName = identifiers.at(-1)?.text;
    if (!localName) {
      continue;
    }

    importedBindings.set(localName, {
      importedName,
      resolvedPath,
      specifier,
    });
  }
}

export function collectImportBindings(
  statement: Parser.SyntaxNode,
  specifier: string,
  resolvedPath: string | null,
  importedBindings: Map<string, ImportedBinding>,
): void {
  const importClause = statement.namedChildren.find((child) => child.type === 'import_clause');
  if (!importClause) {
    return;
  }

  for (const child of importClause.namedChildren) {
    applyImportClauseBinding(child, importedBindings, specifier, resolvedPath);
  }
}

function applyImportClauseBinding(
  child: Parser.SyntaxNode,
  importedBindings: Map<string, ImportedBinding>,
  specifier: string,
  resolvedPath: string | null,
): void {
  if (child.type === 'identifier') {
    addCollectedImportBinding(importedBindings, child.text, 'default', specifier, resolvedPath);
    return;
  }

  if (child.type === 'named_imports') {
    addNamedImportBindings(child, importedBindings, specifier, resolvedPath);
    return;
  }

  if (child.type === 'namespace_import') {
    addNamespaceImportBinding(child, importedBindings, specifier, resolvedPath);
  }
}

function addCollectedImportBinding(
  importedBindings: Map<string, ImportedBinding>,
  localName: string,
  importedName: string,
  specifier: string,
  resolvedPath: string | null,
): void {
  importedBindings.set(localName, {
    importedName,
    resolvedPath,
    specifier,
  });
}

function addNamespaceImportBinding(
  node: Parser.SyntaxNode,
  importedBindings: Map<string, ImportedBinding>,
  specifier: string,
  resolvedPath: string | null,
): void {
  const localName = node.namedChildren.find((namedChild) => namedChild.type === 'identifier')?.text;
  if (localName) {
    addCollectedImportBinding(importedBindings, localName, '*', specifier, resolvedPath);
  }
}

export function getVariableAssignedFunctionSymbol(
  node: Parser.SyntaxNode,
  filePath: string,
): IAnalysisSymbol | null {
  if (node.type !== 'variable_declarator') {
    return null;
  }

  const nameNode = node.childForFieldName('name') ?? node.namedChildren[0];
  const valueNode = node.childForFieldName('value') ?? node.namedChildren.at(-1);
  const name = getIdentifierText(nameNode);

  if (!name || !valueNode) {
    return null;
  }

  if (
    valueNode.type !== 'arrow_function'
    && valueNode.type !== 'function'
    && valueNode.type !== 'function_expression'
  ) {
    return null;
  }

  return createSymbol(filePath, 'function', name, nameNode);
}
