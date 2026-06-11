import type Parser from 'tree-sitter';
import { getDeclaratorNameNode } from './symbolDeclaratorNames';
import { findDescendantByType } from './symbolDescendants';

const IDENTIFIER_NODE_TYPES = new Set([
  'field_identifier',
  'identifier',
  'namespace_identifier',
  'type_identifier',
]);

export function getDeclarationNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  return node.childForFieldName('name') ?? findDescendantByType(node, IDENTIFIER_NODE_TYPES);
}

export function getFunctionNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const declarator = node.childForFieldName('declarator')
    ?? node.namedChildren.find((child) => child.type === 'function_declarator');

  return getDeclaratorNameNode(declarator);
}

export function readQualifiedFunctionDeclaratorText(node: Parser.SyntaxNode): string | null {
  const functionDeclarator = findDescendantByType(node.childForFieldName('declarator'), new Set(['function_declarator']));
  const declarator = functionDeclarator?.childForFieldName('declarator');
  if (declarator?.type === 'qualified_identifier') {
    return declarator.text;
  }

  return null;
}
