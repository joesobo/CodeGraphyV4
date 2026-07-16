import type Parser from 'tree-sitter';

export function shouldSkipDartConcreteMethodReturnType(
  signature: Parser.SyntaxNode,
  typeIdentifier: Parser.SyntaxNode,
): boolean {
  if (typeIdentifier.previousNamedSibling !== null || !isDartSignatureReturnType(signature, typeIdentifier)) return false;
  for (let current: Parser.SyntaxNode | null = signature; current; current = current.parent) {
    if (current.type === 'method_signature') return current.nextNamedSibling?.type === 'function_body';
    if (current.type === 'declaration') return current.namedChildren.some(child => child.type === 'function_body');
  }
  return false;
}

function isDartSignatureReturnType(signature: Parser.SyntaxNode, typeIdentifier: Parser.SyntaxNode): boolean {
  return typeIdentifier.parent === signature || typeIdentifier.parent?.parent === signature;
}
