import type { IAnalysisSymbol } from '@codegraphy/plugin-api';
import { extractClassNameSymbols } from './className';
import { extractDeclarationSymbols } from './declaration';

export { extractClassNameSymbols } from './className';
export { extractDeclarationSymbols } from './declaration';
export { readGDScriptDeclaration } from './declarationText';

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
