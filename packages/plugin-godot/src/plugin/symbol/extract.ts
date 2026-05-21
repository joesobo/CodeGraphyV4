import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { extractClassNameSymbols } from './className';
import { extractDeclarationSymbols } from './declaration';

export function extractSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  return [
    ...extractClassNameSymbols(content, filePath, relativeFilePath),
    ...extractDeclarationSymbols(content, filePath, relativeFilePath),
  ];
}
