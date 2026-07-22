import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addReferenceRelation } from '../analyze/results';
import { isDartTypeLikeExpressionReference } from './typeLikeReference';

export function handleDartIdentifierReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
  currentSymbolKind?: string,
): void {
  const resolvedPath = symbolPaths.get(node.text);
  if (!resolvedPath || resolvedPath === filePath || !isDartTypeLikeExpressionReference(node)) return;
  if (isDartConcreteMethodBodyTypeReference(node, currentSymbolId, currentSymbolKind)) return;
  addReferenceRelation(relations, filePath, node.text, resolvedPath, currentSymbolId);
}

function isDartConcreteMethodBodyTypeReference(
  node: Parser.SyntaxNode,
  currentSymbolId?: string,
  currentSymbolKind?: string,
): boolean {
  const methodContext = currentSymbolKind === 'method' || Boolean(currentSymbolId?.includes(':method:'));
  return methodContext
    && (node.parent?.type.includes('selector') || Boolean(findDartAncestor(node, 'function_body')));
}

function findDartAncestor(node: Parser.SyntaxNode, type: string): Parser.SyntaxNode | null {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === type) return current;
  }
  return null;
}
