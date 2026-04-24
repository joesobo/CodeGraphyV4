import type Parser from 'tree-sitter';
import { addCollectedImportBinding } from './collected';
import { addNamedImportBindings } from './namedBindings';
import type { ImportedBinding } from '../analyze/model';

export function applyImportClauseBinding(
  child: Parser.SyntaxNode,
  importedBindings: Map<string, ImportedBinding>,
  specifier: string,
  resolvedPath: string | null,
  statementBindings: ImportedBinding[],
): void {
  if (child.type === 'identifier') {
    statementBindings.push(
      addCollectedImportBinding(importedBindings, child.text, 'default', specifier, resolvedPath, 'default'),
    );
    return;
  }

  if (child.type === 'named_imports') {
    addNamedImportBindings(child, importedBindings, specifier, resolvedPath, statementBindings);
    return;
  }

  if (child.type === 'namespace_import') {
    addNamespaceImportBinding(child, importedBindings, specifier, resolvedPath, statementBindings);
  }
}

function addNamespaceImportBinding(
  node: Parser.SyntaxNode,
  importedBindings: Map<string, ImportedBinding>,
  specifier: string,
  resolvedPath: string | null,
  statementBindings: ImportedBinding[],
): void {
  const localName = node.namedChildren.find((namedChild) => namedChild.type === 'identifier')?.text;
  if (localName) {
    statementBindings.push(
      addCollectedImportBinding(importedBindings, localName, '*', specifier, resolvedPath, 'namespace'),
    );
  }
}
