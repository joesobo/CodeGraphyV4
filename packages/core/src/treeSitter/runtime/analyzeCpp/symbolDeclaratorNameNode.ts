import type Parser from 'tree-sitter';
import {
  findFirstDeclaratorNameNode,
  findLastDeclaratorNameNode,
} from './symbolDeclaratorSearch';

export function getDeclaratorNameNode(node: Parser.SyntaxNode | null | undefined): Parser.SyntaxNode | null {
  if (!node || isIgnoredDeclaratorNameNode(node)) {
    return null;
  }

  if (isDeclaratorIdentifierNode(node)) {
    return node;
  }

  return getQualifiedDeclaratorNameNode(node)
    ?? getNestedDeclaratorNameNode(node);
}

function isIgnoredDeclaratorNameNode(node: Parser.SyntaxNode): boolean {
  return node.type === 'destructor_name';
}

function isDeclaratorIdentifierNode(node: Parser.SyntaxNode): boolean {
  return node.type === 'field_identifier' || node.type === 'identifier';
}

function getQualifiedDeclaratorNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  if (node.type !== 'qualified_identifier') {
    return null;
  }

  return findLastDeclaratorNameNode(node.namedChildren, getDeclaratorNameNode);
}

function getNestedDeclaratorNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const declarator = node.childForFieldName('declarator');
  if (declarator) {
    return getDeclaratorNameNode(declarator);
  }

  return findFirstDeclaratorNameNode(
    node.namedChildren.filter((child) => child.type !== 'parameter_declaration'),
    getDeclaratorNameNode,
  );
}
