import type { IGDScriptReference } from './types';
import { stripGDScriptComment } from './comments';
import { parseGDScriptDocument } from './document';

/**
 * Detect class_name declarations (not imports -- used for building the class_name map).
 */
export function detectClassNameDeclaration(line: string, lineNumber: number): IGDScriptReference | null {
  const match = stripGDScriptComment(line).trim().match(/^class_name\s+(\w+)/);
  if (match) {
    return {
      resPath: match[1],
      referenceType: 'class_name',
      importType: 'static',
      line: lineNumber,
      isDeclaration: true,
    };
  }
  return null;
}

export function extractGDScriptClassNameDeclarations(content: string): IGDScriptReference[] {
  return parseGDScriptDocument(content).statements
    .map(statement => detectClassNameDeclaration(statement.raw, statement.line))
    .filter((reference): reference is IGDScriptReference => Boolean(reference));
}
