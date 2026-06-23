import * as path from 'path';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { parseGodotTextResourceDocument } from '../../textResource/parser';
import { extractResourceSymbols } from './textResource/standalone';
import { extractSceneSymbols } from './textResource/scene';

const SCENE_EXTENSIONS = new Set(['.tscn']);
const RESOURCE_EXTENSIONS = new Set(['.tres']);

export function extractTextResourceSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  const extension = path.extname(relativeFilePath).toLowerCase();
  if (!SCENE_EXTENSIONS.has(extension) && !RESOURCE_EXTENSIONS.has(extension)) {
    return [];
  }

  const { tags } = parseGodotTextResourceDocument(content);
  if (SCENE_EXTENSIONS.has(extension)) {
    return extractSceneSymbols(filePath, relativeFilePath, tags);
  }

  return extractResourceSymbols(filePath, relativeFilePath, tags);
}
