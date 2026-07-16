import type Parser from 'tree-sitter';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { addTextSymbol } from '../analyzeTextBaseline';

export function addScalaSymbols(
  symbols: IAnalysisSymbol[],
  filePath: string,
  source: string,
  rootNode: Parser.SyntaxNode,
): void {
  for (const match of source.matchAll(/\b(class|trait|object|enum)\s+([A-Za-z_]\w*)/g)) {
    addTextSymbol(symbols, filePath, match[1] === 'trait' ? 'interface' : match[1], match[2], rootNode);
  }
  for (const match of source.matchAll(/\bdef\s+([A-Za-z_]\w*)/g)) {
    addTextSymbol(symbols, filePath, 'method', match[1], rootNode);
  }
  for (const match of source.matchAll(/\btype\s+([A-Za-z_]\w*)\s*=/g)) {
    addTextSymbol(symbols, filePath, 'type', match[1], rootNode);
  }
}
