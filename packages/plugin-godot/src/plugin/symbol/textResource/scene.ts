import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import type { GodotTextResourceTag } from '../../../textResource/types';
import { GODOT_SYMBOL_PLUGIN_KIND } from '../vocabulary';
import { toPascalName } from './names';
import { createTextResourceSymbol } from './factory';

export function extractSceneSymbols(
  filePath: string,
  relativeFilePath: string,
  tags: readonly GodotTextResourceTag[],
): IAnalysisSymbol[] {
  const symbols: IAnalysisSymbol[] = [];
  const rootNode = readRootSceneNode(tags);
  const sceneName = rootNode?.fields.name ?? toPascalName(relativeFilePath);

  symbols.push(createTextResourceSymbol(
    relativeFilePath,
    filePath,
    sceneName,
    'scene',
    rootNode?.line ?? 1,
    GODOT_SYMBOL_PLUGIN_KIND.scene,
  ));

  for (const tag of tags) {
    if (tag.name !== 'node' || !tag.fields.name) {
      continue;
    }

    symbols.push(createTextResourceSymbol(
      relativeFilePath,
      filePath,
      tag.fields.name,
      'scene-node',
      tag.line,
      GODOT_SYMBOL_PLUGIN_KIND.sceneNode,
    ));
  }

  return symbols;
}

function readRootSceneNode(tags: readonly GodotTextResourceTag[]): GodotTextResourceTag | undefined {
  return tags.find(tag => tag.name === 'node' && !tag.fields.parent && tag.fields.name);
}
