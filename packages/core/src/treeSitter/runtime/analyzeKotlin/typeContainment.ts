import type Parser from 'tree-sitter';

export function isInsideKotlinType(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === 'class_declaration' || current.type === 'object_declaration') {
      return true;
    }

    current = current.parent;
  }

  return false;
}
