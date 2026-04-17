import type Parser from 'tree-sitter';
import { getNodeText } from '../nodes';

const C_SHARP_NAMESPACE_NAME_TYPES = new Set([
  'identifier',
  'qualified_name',
  'alias_qualified_name',
]);

function getCSharpNamespaceName(node: Parser.SyntaxNode): string | null {
  const nameNode = node.childForFieldName('name');
  if (nameNode) {
    return getNodeText(nameNode);
  }

  return getNodeText(
    node.namedChildren.find((child) => C_SHARP_NAMESPACE_NAME_TYPES.has(child.type)),
  );
}

export function getCSharpFileScopedNamespaceName(rootNode: Parser.SyntaxNode): string | null {
  const declaration = rootNode.namedChildren.find(
    (child) => child.type === 'file_scoped_namespace_declaration',
  );
  return declaration ? getCSharpNamespaceName(declaration) : null;
}

export function getResolvedNamespaceName(
  node: Parser.SyntaxNode,
  fallback: string | null,
): string | null {
  return getCSharpNamespaceName(node) ?? fallback;
}
