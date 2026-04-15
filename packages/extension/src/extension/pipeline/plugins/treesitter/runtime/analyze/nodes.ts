import * as fs from 'node:fs';
import type Parser from 'tree-sitter';

export function getStringSpecifier(node: Parser.SyntaxNode | null | undefined): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'string': {
      const fragment = node.namedChildren.find((child) => child.type === 'string_fragment');
      if (fragment) {
        return fragment.text;
      }

      return node.text.length >= 2 ? node.text.slice(1, -1) : null;
    }
    case 'interpreted_string_literal': {
      const fragment = node.namedChildren.find((child) => child.type === 'interpreted_string_literal_content');
      return fragment?.text ?? null;
    }
    default:
      return null;
  }
}

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

export function findExistingFile(candidates: readonly string[]): string | null {
  for (const candidatePath of candidates) {
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return null;
}
