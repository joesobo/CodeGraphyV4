import type Parser from 'tree-sitter';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import { addReferenceRelation } from '../analyze/results';

export function handleDartTypeReference(
  node: Parser.SyntaxNode,
  filePath: string,
  relations: IAnalysisRelation[],
  symbolPaths: ReadonlyMap<string, string | null>,
  currentSymbolId?: string,
): void {
  const resolvedPath = symbolPaths.get(node.text);
  if (!resolvedPath || resolvedPath === filePath || isDartInheritedTypeReference(node)) return;
  addReferenceRelation(relations, filePath, node.text, resolvedPath, currentSymbolId);
}

function isDartInheritedTypeReference(node: Parser.SyntaxNode): boolean {
  for (let current: Parser.SyntaxNode | null = node.parent; current; current = current.parent) {
    if (current.type === 'class_definition') return isBeforeDartClassBody(node, current);
    if (current.type === 'function_signature' || current.type === 'method_signature') return false;
  }
  return false;
}

function isBeforeDartClassBody(node: Parser.SyntaxNode, classNode: Parser.SyntaxNode): boolean {
  const classBody = classNode.namedChildren.find(child => child.type === 'class_body');
  return Boolean(classBody && node.endIndex <= classBody.startIndex);
}
