import * as path from 'path';
import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { parseGodotProjectSettingsDocument } from '../../textResource/parser';
import {
  GODOT_PROJECT_SETTINGS_LANGUAGE,
  GODOT_SYMBOL_PLUGIN_KIND,
  GODOT_SYMBOL_SOURCE,
} from './godotKinds';

export function extractProjectSettingsSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  if (path.basename(relativeFilePath) !== 'project.godot') {
    return [];
  }

  return parseGodotProjectSettingsDocument(content).settings
    .filter(setting => setting.section === 'autoload')
    .map((setting): IAnalysisSymbol => ({
      id: `${relativeFilePath}#${setting.key}:autoload`,
      name: setting.key,
      kind: 'autoload',
      filePath,
      signature: `${setting.key}=${setting.value}`,
      range: {
        startLine: setting.line,
        startColumn: 1,
        endLine: setting.line,
        endColumn: setting.key.length + 1,
      },
      metadata: {
        language: GODOT_PROJECT_SETTINGS_LANGUAGE,
        source: GODOT_SYMBOL_SOURCE,
        pluginKind: GODOT_SYMBOL_PLUGIN_KIND.autoload,
      },
    }));
}
