import type { IAnalysisSymbol } from '@codegraphy/plugin-api';
import { parseGDScriptDocument } from '../../parser';
import manifest from '../../../codegraphy.json';
import {
  readGDScriptDeclaration,
  type GDScriptDeclaration,
} from './declarationText';

function createGDScriptSymbol(
  relativeFilePath: string,
  filePath: string,
  declaration: GDScriptDeclaration,
  line: string,
  lineNumber: number,
): IAnalysisSymbol {
  const startColumn = line.indexOf(declaration.signature) + 1;

  return {
    id: `${relativeFilePath}#${declaration.name}:${declaration.kind}`,
    name: declaration.name,
    kind: declaration.kind,
    filePath,
    signature: declaration.signature,
    range: {
      startLine: lineNumber,
      startColumn,
      endLine: lineNumber,
      endColumn: startColumn + declaration.signature.length,
    },
    metadata: {
      language: 'gdscript',
      source: manifest.id,
    },
  };
}

export function extractDeclarationSymbols(
  content: string,
  filePath: string,
  relativeFilePath: string,
): IAnalysisSymbol[] {
  const symbols: IAnalysisSymbol[] = [];

  for (const statement of parseGDScriptDocument(content).statements) {
    const declaration = readGDScriptDeclaration(statement.trimmed);
    if (!declaration) {
      continue;
    }

    symbols.push(createGDScriptSymbol(
      relativeFilePath,
      filePath,
      declaration,
      statement.raw,
      statement.line,
    ));
  }

  return symbols;
}
