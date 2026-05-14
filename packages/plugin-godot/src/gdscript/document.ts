import type { GDScriptDocument, GDScriptStatement } from './types';
import { stripGDScriptComment } from './comments';

export function parseGDScriptDocument(content: string): GDScriptDocument {
  const statements = content
    .split('\n')
    .map((raw, index): GDScriptStatement => {
      const code = stripGDScriptComment(raw);
      return {
        line: index + 1,
        raw,
        code,
        trimmed: code.trim(),
      };
    })
    .filter(statement => statement.trimmed.length > 0);

  return { statements };
}
