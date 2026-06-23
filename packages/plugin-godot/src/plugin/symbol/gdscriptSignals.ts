import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { parseGDScriptDocument } from '../../parser';
import {
  GODOT_SCRIPT_LANGUAGE,
  GODOT_SYMBOL_PLUGIN_KIND,
  GODOT_SYMBOL_SOURCE,
} from './vocabulary';

const SIGNAL_DECLARATION_PATTERN = /^signal\s+([A-Za-z_][A-Za-z0-9_]*)\b/;

export function extractSignalSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  const symbols: IAnalysisSymbol[] = [];

  for (const statement of parseGDScriptDocument(content).statements) {
    const match = statement.trimmed.match(SIGNAL_DECLARATION_PATTERN);
    if (!match) {
      continue;
    }

    const name = match[1];
    const startColumn = statement.raw.indexOf(name) + 1;
    symbols.push({
      id: `${relativeFilePath}#${name}:signal`,
      name,
      kind: 'signal',
      filePath,
      signature: statement.trimmed,
      range: {
        startLine: statement.line,
        startColumn,
        endLine: statement.line,
        endColumn: startColumn + name.length,
      },
      metadata: {
        language: GODOT_SCRIPT_LANGUAGE,
        source: GODOT_SYMBOL_SOURCE,
        pluginKind: GODOT_SYMBOL_PLUGIN_KIND.signal,
      },
    });
  }

  return symbols;
}
