import type { IAnalysisRange, IAnalysisSymbol } from '@codegraphy-dev/plugin-api';

export function addPascalSymbols(symbols: IAnalysisSymbol[], filePath: string, source: string): void {
  for (const match of source.matchAll(/\b([A-Za-z_]\w*)\s*=\s*(class|record|interface)\b/gi)) {
    addPascalSymbol(symbols, filePath, match[2].toLowerCase() === 'record' ? 'struct' : match[2].toLowerCase(), match[1]);
  }
  for (const match of source.matchAll(/\b(?:procedure|function)\s+(?:[A-Za-z_]\w*\.)?([A-Za-z_]\w*)/gi)) {
    addPascalSymbol(symbols, filePath, 'method', match[1]);
  }
}

function addPascalSymbol(symbols: IAnalysisSymbol[], filePath: string, kind: string, name: string): void {
  const range: IAnalysisRange = { startLine: 1, startColumn: 1, endLine: 1, endColumn: 1 };
  symbols.push({ id: `${filePath}:${kind}:${name}`, filePath, kind, name, range });
}
