import type Parser from 'tree-sitter';
import { CLASS_LIKE_NODE_TYPES } from './model';

export function hasFunctionDeclarator(node: Parser.SyntaxNode): boolean {
  return node.namedChildren.some((child) =>
    child.type === 'function_declarator' || hasFunctionDeclarator(child),
  );
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
