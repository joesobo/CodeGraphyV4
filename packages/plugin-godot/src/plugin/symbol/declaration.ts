import type { IAnalysisSymbol } from '@codegraphy-dev/plugin-api';
import { parseGDScriptDocument } from '../../parser';
import {
  readGDScriptDeclaration,
  type GDScriptDeclaration,
} from './declarationText';
import {
  GODOT_SCRIPT_LANGUAGE,
  GODOT_SYMBOL_PLUGIN_KIND,
  GODOT_SYMBOL_SOURCE,
} from './godotKinds';

const EXPORT_DECORATOR_PATTERN = /^@export(?:_[A-Za-z_][A-Za-z0-9_]*)?(?:\([^)]*\))?\s+/;

function readPluginKind(
  declaration: GDScriptDeclaration,
  trimmedLine: string,
): string | undefined {
  if (declaration.kind === 'variable' && EXPORT_DECORATOR_PATTERN.test(trimmedLine)) {
    return GODOT_SYMBOL_PLUGIN_KIND.exportedProperty;
  }

  return undefined;
}

function createGDScriptSymbol(
  relativeFilePath: string,
  filePath: string,
  declaration: GDScriptDeclaration,
  line: string,
  lineNumber: number,
  pluginKind: string | undefined,
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
      language: GODOT_SCRIPT_LANGUAGE,
      source: GODOT_SYMBOL_SOURCE,
      ...(pluginKind ? { pluginKind } : {}),
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
      readPluginKind(declaration, statement.trimmed),
    ));
  }

  return symbols;
}
