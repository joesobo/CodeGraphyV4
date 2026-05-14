import type { GDScriptStatement, IGDScriptReference } from './types';
import { isResPath } from './path';

const PRELOAD_RESOURCE_PATTERN = /preload\s*\(\s*["']([^"']+)["']\s*\)/g;
const LOAD_RESOURCE_PATTERN = /(?<!pre)(?:ResourceLoader\.)?load\s*\(\s*["']([^"']+)["']\s*\)/g;

function appendResourceCallReferences(
  references: IGDScriptReference[],
  statement: GDScriptStatement,
  pattern: RegExp,
  referenceType: 'preload' | 'load',
  importType: 'static' | 'dynamic',
): void {
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(statement.code)) !== null) {
    if (isResPath(match[1])) {
      references.push({
        resPath: match[1],
        referenceType,
        importType,
        line: statement.line,
      });
    }
  }
}

export function extractGDScriptLoadReferences(statement: GDScriptStatement): IGDScriptReference[] {
  const references: IGDScriptReference[] = [];
  appendResourceCallReferences(references, statement, PRELOAD_RESOURCE_PATTERN, 'preload', 'static');
  appendResourceCallReferences(references, statement, LOAD_RESOURCE_PATTERN, 'load', 'dynamic');
  return references;
}
