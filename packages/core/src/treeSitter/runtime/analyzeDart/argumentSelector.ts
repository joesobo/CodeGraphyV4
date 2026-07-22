import type Parser from 'tree-sitter';

export function isFollowedByDartArgumentSelector(node: Parser.SyntaxNode): boolean {
  const selector = findDartSelectorAncestor(node);
  if (selector && hasDartArgumentPart(node, selector)) return true;
  const nextNode = node.nextNamedSibling;
  return nextNode?.type === 'selector'
    && nextNode.namedChildren.some(child => child.type === 'argument_part');
}

function hasDartArgumentPart(node: Parser.SyntaxNode, selector: Parser.SyntaxNode): boolean {
  return node.nextNamedSibling?.type === 'argument_part'
    || selector.namedChildren.some(child => child.type === 'argument_part')
    || Boolean(selector.nextNamedSibling?.namedChildren.some(child => child.type === 'argument_part'));
}

function findDartSelectorAncestor(node: Parser.SyntaxNode): Parser.SyntaxNode | null {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === 'selector') return current;
  }
  return null;
}
