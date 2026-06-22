import * as path from 'path';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { extractClassNameSymbols } from './className';
import { extractDeclarationSymbols } from './declaration';
import { extractSignalSymbols } from './gdscriptSignals';
import { extractProjectSettingsSymbols } from './projectSettingsSymbols';
import { extractTextResourceSymbols } from './textResourceSymbols';

const GDSCRIPT_EXTENSION = '.gd';
const PROJECT_SETTINGS_EXTENSION = '.godot';
const TEXT_RESOURCE_EXTENSIONS = new Set(['.tscn', '.tres']);

export function extractSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  const extension = path.extname(relativeFilePath).toLowerCase();
  if (TEXT_RESOURCE_EXTENSIONS.has(extension)) {
    return extractTextResourceSymbols(content, filePath, relativeFilePath);
  }

  if (extension === PROJECT_SETTINGS_EXTENSION) {
    return extractProjectSettingsSymbols(content, filePath, relativeFilePath);
  }

  if (extension !== GDSCRIPT_EXTENSION) {
    return [];
  }

  return [
    ...extractClassNameSymbols(content, filePath, relativeFilePath),
    ...extractDeclarationSymbols(content, filePath, relativeFilePath),
    ...extractSignalSymbols(content, filePath, relativeFilePath),
  ];
}
