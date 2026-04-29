import type Parser from 'tree-sitter';
import type { ImportedBinding } from '../analyze/model';
import { getIdentifierText } from '../analyze/text';

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
  propertyFieldName?: string,
): ImportedBinding | null {
  if (node?.type !== accessType) {
    return null;
  }

  const objectNode = node.childForFieldName(objectFieldName) ?? node.namedChildren[0];
  const binding = getImportedBindingByIdentifier(objectNode, importedBindings);
  if (!binding) {
    return null;
  }

  const propertyNode = propertyFieldName
    ? node.childForFieldName(propertyFieldName) ?? node.namedChildren.at(-1)
    : undefined;
  const memberName = propertyNode?.text;
  if (!memberName) {
    return binding;
  }

  return {
    ...binding,
    importedName: binding.importedName === '*' ? memberName : binding.importedName,
    memberName,
  };
}
