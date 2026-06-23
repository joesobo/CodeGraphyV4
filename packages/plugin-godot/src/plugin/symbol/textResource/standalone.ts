import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { GodotTextResourceTag } from '../../../textResource/types';
import { GODOT_SYMBOL_PLUGIN_KIND } from '../vocabulary';
import { toPascalName } from './names';
import { createTextResourceSymbol } from './factory';

export function extractResourceSymbols(
  filePath: string,
  relativeFilePath: string,
  tags: readonly GodotTextResourceTag[],
): IAnalysisSymbol[] {
  const resourceTag = tags.find(tag => tag.name === 'gd_resource');
  return [
    createTextResourceSymbol(
      relativeFilePath,
      filePath,
      toPascalName(relativeFilePath),
      'resource',
      resourceTag?.line ?? 1,
      GODOT_SYMBOL_PLUGIN_KIND.resource,
    ),
  ];
}
