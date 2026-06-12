import type Parser from 'tree-sitter';
import {
  getDeclarationNameNode,
  getFunctionNameNode,
} from '../lookup/names';

export function getTemplateDeclarationNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  if (node.type === 'function_definition' || node.type === 'declaration') {
    return getFunctionNameNode(node) ?? getDeclarationNameNode(node);
  }

  return getDeclarationNameNode(node);
}
