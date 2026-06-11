import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { createSymbol } from '../analyze/results';

export function addNamedSymbol(
  symbols: IAnalysisSymbol[],
  filePath: string,
  kind: string,
  nameNode: Parser.SyntaxNode | null,
  rangeNode: Parser.SyntaxNode,
  name = nameNode?.text,
  signature?: string,
): void {
  if (!nameNode || !name) {
    return;
  }

  symbols.push(createSymbol(filePath, kind, name, rangeNode, signature));
}

export function createRangeSignature(node: Parser.SyntaxNode): string {
  return `${node.startPosition.row + 1}:${node.startPosition.column + 1}`;
}
