import type Parser from 'tree-sitter';
import type { ImportedBinding } from '../model';
import { getIdentifierText } from '../text';

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
