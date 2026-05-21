import * as path from 'path';
import type { IAnalysisRelation } from '@codegraphy-dev/plugin-api';
import type { GodotAnalysisContext } from './types';
import { detect as detectPreload } from '../sources/preload';
import { detect as detectLoad } from '../sources/load';
import { detect as detectExtends } from '../sources/extends';
import { detect as detectClassNameUsage } from '../sources/class-name-usage';
import { detect as detectExtResource } from '../sources/ext-resource';
import { detect as detectProjectSettings } from '../sources/project-settings';

const TEXT_RESOURCE_EXTENSIONS = new Set(['.tscn', '.tres']);
const PROJECT_SETTINGS_EXTENSIONS = new Set(['.godot']);

export function detectRelations(
  content: string,
  filePath: string,
  context: GodotAnalysisContext,
): IAnalysisRelation[] {
  const extension = path.extname(filePath).toLowerCase();
  if (TEXT_RESOURCE_EXTENSIONS.has(extension)) {
    return detectExtResource(content, filePath, context);
  }

  if (PROJECT_SETTINGS_EXTENSIONS.has(extension)) {
    return detectProjectSettings(content, filePath, context);
  }

  return [
    ...detectPreload(content, filePath, context),
    ...detectLoad(content, filePath, context),
    ...detectExtends(content, filePath, context),
    ...detectClassNameUsage(content, filePath, context),
  ];
}
