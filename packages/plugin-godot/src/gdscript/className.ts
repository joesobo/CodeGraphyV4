import type { IGDScriptReference } from './types';
import { stripGDScriptComment } from './comments';

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
