import type Parser from 'tree-sitter';
import { createSymbolId } from '../analyze/results';

export function readCallName(callExpression: Parser.SyntaxNode): string | null {
  return readDeclaratorName(callExpression.childForFieldName('function') ?? callExpression.namedChildren[0]);
}

export function readEnclosingFunctionSymbolId(node: Parser.SyntaxNode, filePath: string): string | undefined {
  let current: Parser.SyntaxNode | null = node.parent;
  while (current) {
    if (current.type === 'function_definition') {
      const functionName = readDeclaratorName(current.childForFieldName('declarator'));
      return functionName ? createSymbolId(filePath, 'function', functionName) : undefined;
    }
    current = current.parent;
  }
  return undefined;
}

export function readDeclaratorName(node: Parser.SyntaxNode | undefined | null): string | null {
  if (!node) return null;
  if (node.type === 'field_identifier' || node.type === 'identifier') return node.text;
  const declarator = node.childForFieldName('declarator');
  return declarator
    ? readDeclaratorName(declarator)
    : node.namedChildren.map(readDeclaratorName).find(Boolean) ?? null;
}
