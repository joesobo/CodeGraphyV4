import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { addTextSymbol } from '../analyzeTextBaseline';

export function addObjectiveCSymbols(
  symbols: IAnalysisSymbol[],
  filePath: string,
  source: string,
  rootNode: Parser.SyntaxNode,
): void {
  for (const match of source.matchAll(/^\s*@(interface|protocol|implementation)\s+([A-Za-z_]\w*)/gm)) {
    addTextSymbol(symbols, filePath, match[1] === 'protocol' ? 'protocol' : 'class', match[2], rootNode);
  }
  for (const match of source.matchAll(/^\s*[-+]\s*\([^)]*\)\s*([A-Za-z_]\w*)/gm)) {
    addTextSymbol(symbols, filePath, 'method', match[1], rootNode);
  }
}
