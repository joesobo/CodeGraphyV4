import type { IAnalysisSymbol } from '@codegraphy/plugin-api';
import {
  detectClassNameDeclaration,
  parseGDScriptDocument,
} from '../../parser';
import manifest from '../../../codegraphy.json';

export function extractClassNameSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  const symbols: IAnalysisSymbol[] = [];

  for (const statement of parseGDScriptDocument(content).statements) {
    const ref = detectClassNameDeclaration(statement.code, statement.line);
    if (!ref) {
      continue;
    }

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
        language: 'gdscript',
        source: manifest.id,
        pluginKind: 'godot-class-name',
      },
    });
  }

  return symbols;
}
