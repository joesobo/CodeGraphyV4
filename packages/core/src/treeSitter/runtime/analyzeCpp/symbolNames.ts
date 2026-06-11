import type Parser from 'tree-sitter';
import { CLASS_LIKE_NODE_TYPES } from './symbolModel';

const DECLARATOR_NODE_TYPES = new Set([
  'array_declarator',
  'field_identifier',
  'function_declarator',
  'identifier',
  'init_declarator',
  'pointer_declarator',
  'reference_declarator',
]);

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

  return findLastDeclaratorNameNode(node.namedChildren);
}

function getNestedDeclaratorNameNode(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  const declarator = node.childForFieldName('declarator');
  if (declarator) {
    return getDeclaratorNameNode(declarator);
  }

  return findFirstDeclaratorNameNode(node.namedChildren.filter((child) => child.type !== 'parameter_declaration'));
}

function findFirstDeclaratorNameNode(nodes: ReadonlyArray<Parser.SyntaxNode>): Parser.SyntaxNode | null {
  for (const child of nodes) {
    const match = getDeclaratorNameNode(child);
    if (match) {
      return match;
    }
  }

  return null;
}

function findLastDeclaratorNameNode(nodes: ReadonlyArray<Parser.SyntaxNode>): Parser.SyntaxNode | null {
  for (const child of [...nodes].reverse()) {
    const match = getDeclaratorNameNode(child);
    if (match) {
      return match;
    }
  }

  return null;
}

export function getDeclaratorNameNodes(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
  const declarators = node.namedChildren.filter((child) => DECLARATOR_NODE_TYPES.has(child.type));
  const explicitDeclarators = declarators.filter((child) => child.type !== 'identifier' && child.type !== 'field_identifier');
  const candidates = explicitDeclarators.length > 0
    ? explicitDeclarators
    : declarators.filter((child) => child.type === 'identifier' || child.type === 'field_identifier');

  return candidates
    .map((child) => getDeclaratorNameNode(child))
    .filter((nameNode): nameNode is Parser.SyntaxNode => Boolean(nameNode?.text));
}

function findDescendantByType(
  node: Parser.SyntaxNode | null | undefined,
  types: ReadonlySet<string>,
): Parser.SyntaxNode | null {
  const queue = node ? [node] : [];
  for (const candidate of queue) {
    if (types.has(candidate.type)) {
      return candidate;
    }

    queue.push(...candidate.namedChildren);
  }

  return null;
}

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

export function readQualifiedFunctionDeclaratorText(node: Parser.SyntaxNode): string | null {
  const functionDeclarator = findDescendantByType(node.childForFieldName('declarator'), new Set(['function_declarator']));
  const declarator = functionDeclarator?.childForFieldName('declarator');
  if (declarator?.type === 'qualified_identifier') {
    return declarator.text;
  }

  return null;
}
