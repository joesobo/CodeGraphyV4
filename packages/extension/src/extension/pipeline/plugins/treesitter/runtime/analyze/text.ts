import type Parser from 'tree-sitter';

export function getIdentifierText(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'field_identifier':
    case 'identifier':
    case 'package_identifier':
    case 'property_identifier':
    case 'type_identifier':
      return node.text;
    default:
      return null;
  }
}

export function getNodeText(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  const identifier = getIdentifierText(node);
  if (identifier) {
    return identifier;
  }

  switch (node.type) {
    case 'dotted_name':
    case 'qualified_name':
    case 'relative_import':
    case 'scoped_identifier':
      return node.text;
    default:
      return null;
  }
}

export function joinModuleSpecifier(moduleSpecifier: string, importedName: string): string {
  if (!moduleSpecifier) {
    return importedName;
  }

  return moduleSpecifier.endsWith('.')
    ? `${moduleSpecifier}${importedName}`
    : `${moduleSpecifier}.${importedName}`;
}

export function getLastPathSegment(specifier: string, separator: string): string {
  const parts = specifier.split(separator).filter(Boolean);
  return parts.at(-1) ?? specifier;
}
