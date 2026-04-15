import type Parser from 'tree-sitter';
import { addCollectedImportBinding } from './importClauseCollectedBinding';
import { addNamedImportBindings } from './importClauseNamedBindings';
import type { ImportedBinding } from './model';

export function applyImportClauseBinding(
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
