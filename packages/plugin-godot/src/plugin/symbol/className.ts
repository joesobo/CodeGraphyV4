import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import {
  extractGDScriptClassNameDeclarations,
} from '../../parser';
import {
  GODOT_SCRIPT_LANGUAGE,
  GODOT_SYMBOL_PLUGIN_KIND,
  GODOT_SYMBOL_SOURCE,
} from './godotKinds';

export function extractClassNameSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  const symbols: IAnalysisSymbol[] = [];

  for (const ref of extractGDScriptClassNameDeclarations(content)) {
    const signature = `class_name ${ref.resPath}`;
    symbols.push({
      id: `${relativeFilePath}#${ref.resPath}:godot-class-name`,
      name: ref.resPath,
      kind: 'class',
      filePath,
      signature,
      range: {
        startLine: ref.line,
        startColumn: 1,
        endLine: ref.line,
        endColumn: signature.length + 1,
      },
      metadata: {
        language: GODOT_SCRIPT_LANGUAGE,
        source: GODOT_SYMBOL_SOURCE,
        pluginKind: GODOT_SYMBOL_PLUGIN_KIND.className,
      },
    });
  }

  return symbols;
}
