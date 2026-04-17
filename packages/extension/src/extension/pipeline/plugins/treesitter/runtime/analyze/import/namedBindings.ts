import type Parser from 'tree-sitter';
import { addCollectedImportBinding } from './collectedBinding';
import type { ImportedBinding } from '../model';

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

    addCollectedImportBinding(importedBindings, localName, importedName ?? localName, specifier, resolvedPath);
  }
}
