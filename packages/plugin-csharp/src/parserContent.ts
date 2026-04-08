import { parseNamespaceDeclaration } from './parseNamespaceDeclaration';
import { parseUsingDirective } from './parseUsingDirective';
import { stripCommentsFromLine } from './parserLineCommentStripper';
import type { IDetectedNamespace, IDetectedUsing } from './parserTypes';

export function parseContent(content: string): {
  usings: IDetectedUsing[];
  namespaces: IDetectedNamespace[];
} {
  const usings: IDetectedUsing[] = [];
  const namespaces: IDetectedNamespace[] = [];

  const lines = content.split('\n');
  let inMultiLineComment = false;

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const stripped = stripCommentsFromLine(lines[index], { inMultiLineComment });
    inMultiLineComment = stripped.state.inMultiLineComment;

    const trimmed = stripped.code.trim();
    const usingMatch = trimmed ? parseUsingDirective(trimmed) : null;
    if (usingMatch) {
      usings.push({ ...usingMatch, line: lineNumber });
      continue;
    }

    const namespaceMatch = trimmed ? parseNamespaceDeclaration(trimmed) : null;
    if (namespaceMatch) {
      namespaces.push({ ...namespaceMatch, line: lineNumber });
    }
  }

  return { usings, namespaces };
}
