import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import {
  GODOT_SYMBOL_SOURCE,
  GODOT_TEXT_RESOURCE_LANGUAGE,
} from '../vocabulary';

export function createTextResourceSymbol(
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
