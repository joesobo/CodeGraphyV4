import type Parser from 'tree-sitter';
import { CPP_TYPE_NODE_TYPES } from './model';

export function isInsideClassLike(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (CPP_TYPE_NODE_TYPES.has(current.type)) {
      return true;
    }

    current = current.parent;
  }

  return false;
}

export function readContainingCppTypeName(node: Parser.SyntaxNode): string | null {
  let current = node.parent;

  while (current) {
    if (CPP_TYPE_NODE_TYPES.has(current.type)) {
      return current.childForFieldName('name')?.text ?? null;
    }

    current = current.parent;
  }

  return null;
}

export function isInsideFunctionDefinition(node: Parser.SyntaxNode): boolean {
  let current = node.parent;

  while (current) {
    if (current.type === 'function_definition') {
      return true;
    }

    current = current.parent;
  }

  return false;
}

export function isPureVirtualDeclaration(node: Parser.SyntaxNode): boolean {
  return /=\s*0\s*;?$/.test(node.text.trim());
}
