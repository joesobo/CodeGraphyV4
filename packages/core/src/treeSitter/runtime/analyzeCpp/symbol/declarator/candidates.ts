import type Parser from 'tree-sitter';
import { getDeclaratorNameNode } from './nameNode';

const DECLARATOR_NODE_TYPES = new Set([
  'array_declarator',
  'field_identifier',
  'function_declarator',
  'identifier',
  'init_declarator',
  'pointer_declarator',
  'reference_declarator',
]);

export function getDeclaratorNameNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  return readDeclaratorCandidates(node)
    .map((child) => getDeclaratorNameNode(child))
    .filter((nameNode): nameNode is Parser.SyntaxNode => Boolean(nameNode?.text));
}

function readDeclaratorCandidates(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const declarators = node.namedChildren.filter((child) => DECLARATOR_NODE_TYPES.has(child.type));
  const explicitDeclarators = declarators.filter((child) => child.type !== 'identifier' && child.type !== 'field_identifier');
  return explicitDeclarators.length > 0
    ? explicitDeclarators
    : declarators;
}
