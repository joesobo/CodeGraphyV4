import type Parser from 'tree-sitter';

const IDENTIFIER_NODE_TYPES = new Set([
  'field_identifier',
  'identifier',
  'namespace_identifier',
  'type_identifier',
]);

const CLASS_LIKE_NODE_TYPES = new Set([
  'class_specifier',
  'struct_specifier',
  'union_specifier',
]);

export function findDescendantByType(
  node: Parser.SyntaxNode | null | undefined,
  types: ReadonlySet<string>,
): Parser.SyntaxNode | null {
  if (!node) {
    return null;
  }

  if (types.has(node.type)) {
    return node;
  }

  for (const child of node.namedChildren) {
    const match = findDescendantByType(child, types);
    if (match) {
      return match;
    }
  }

  return null;
}

export function getDeclarationNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  return node.childForFieldName('name') ?? findDescendantByType(node, IDENTIFIER_NODE_TYPES);
}

export function getFunctionNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const declarator = node.childForFieldName('declarator')
    ?? node.namedChildren.find((child) => child.type === 'function_declarator');

  return findDescendantByType(declarator, IDENTIFIER_NODE_TYPES);
}

export function hasFunctionDeclarator(node: Parser.SyntaxNode): boolean {
  return node.namedChildren.some((child) => child.type === 'function_declarator');
}

export function isInsideClassLike(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (CLASS_LIKE_NODE_TYPES.has(current.type)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}
