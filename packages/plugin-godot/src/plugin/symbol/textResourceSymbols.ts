import * as path from 'path';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { parseGodotTextResourceDocument } from '../../textResource/parser';
import type { GodotTextResourceTag } from '../../textResource/types';
import {
  GODOT_SYMBOL_PLUGIN_KIND,
  GODOT_SYMBOL_SOURCE,
  GODOT_TEXT_RESOURCE_LANGUAGE,
} from './godotKinds';

const SCENE_EXTENSIONS = new Set(['.tscn']);
const RESOURCE_EXTENSIONS = new Set(['.tres']);

function toPascalName(relativeFilePath: string): string {
  return path.parse(relativeFilePath).name
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function createTextResourceSymbol(
  relativeFilePath: string,
  filePath: string,
  name: string,
  kind: string,
  line: number,
  pluginKind: string,
): IAnalysisSymbol {
  return {
    id: `${relativeFilePath}#${name}:${kind}:${line}`,
    name,
    kind,
    filePath,
    range: {
      startLine: line,
      startColumn: 1,
      endLine: line,
    },
    metadata: {
      language: GODOT_TEXT_RESOURCE_LANGUAGE,
      source: GODOT_SYMBOL_SOURCE,
      pluginKind,
    },
  };
}

function readRootSceneNode(tags: readonly GodotTextResourceTag[]): GodotTextResourceTag | undefined {
  return tags.find(tag => tag.name === 'node' && !tag.fields.parent && tag.fields.name);
}

function extractSceneSymbols(
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

function extractResourceSymbols(
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
