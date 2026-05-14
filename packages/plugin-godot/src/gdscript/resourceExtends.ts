import type { GDScriptStatement, IGDScriptReference } from './types';
import { isResPath } from './path';

const EXTENDS_RESOURCE_PATTERN = /^extends\s+["']([^"']+)["']/;

export function extractGDScriptExtendsReference(
  statement: GDScriptStatement,
): IGDScriptReference | null {
  const match = statement.trimmed.match(EXTENDS_RESOURCE_PATTERN);
  if (!match || !isResPath(match[1])) {
    return null;
  }

  return {
    resPath: match[1],
    referenceType: 'extends',
    importType: 'static',
    line: statement.line,
  };
}
