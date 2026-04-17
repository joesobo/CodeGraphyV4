import type Parser from 'tree-sitter';

const C_SHARP_NAMESPACE_NAME_TYPES = new Set([
  'identifier',
  'qualified_name',
  'alias_qualified_name',
]);

export function getCSharpIdentifierText(
  node: Parser.SyntaxNode | null | undefined,
): string | null {
  if (!node) {
    return null;
  }

  switch (node.type) {
    case 'identifier':
    case 'type_identifier':
      return node.text;
    default:
      return null;
  }
}

export function getCSharpNodeText(
  node: Parser.SyntaxNode | null | undefined,
): string | null {
  if (!node) {
    return null;
  }

  const identifier = getCSharpIdentifierText(node);
  if (identifier) {
    return identifier;
  }

  switch (node.type) {
    case 'alias_qualified_name':
    case 'generic_name':
    case 'qualified_name':
      return node.text;
    default:
      return null;
  }
}

export function getCSharpNamespaceName(node: Parser.SyntaxNode): string | null {
  const nameNode = node.childForFieldName('name');
  if (nameNode) {
    return getCSharpNodeText(nameNode);
  }

  return getCSharpNodeText(
    node.namedChildren.find((child) => C_SHARP_NAMESPACE_NAME_TYPES.has(child.type)),
  );
}

export function getCSharpFileScopedNamespaceName(
  rootNode: Parser.SyntaxNode,
): string | null {
  const declaration = rootNode.namedChildren.find(
    (child) => child.type === 'file_scoped_namespace_declaration',
  );
  return declaration ? getCSharpNamespaceName(declaration) : null;
}
