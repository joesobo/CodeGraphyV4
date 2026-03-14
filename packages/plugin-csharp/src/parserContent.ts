import { parseNamespaceDeclaration, parseUsingDirective } from './parserLineParsers';
import { stripCommentsFromLine, type LineParseState } from './parserComments';
import type { IDetectedNamespace, IDetectedUsing } from './parserTypes';

export function parseContent(content: string): {
  usings: IDetectedUsing[];
  namespaces: IDetectedNamespace[];
} {
  const usings: IDetectedUsing[] = [];
  const namespaces: IDetectedNamespace[] = [];

  const lines = content.split('\n');
  let state: LineParseState = { inMultiLineComment: false };

  for (let index = 0; index < lines.length; index++) {
    const lineNumber = index + 1;
    const stripped = stripCommentsFromLine(lines[index], state);
    state = stripped.state;

    const trimmed = stripped.code.trim();
    if (!trimmed) {
      continue;
    }

    const usingMatch = parseUsingDirective(trimmed);
    if (usingMatch) {
      usings.push({ ...usingMatch, line: lineNumber });
      continue;
    }

    const namespaceMatch = parseNamespaceDeclaration(trimmed);
    if (namespaceMatch) {
      namespaces.push({ ...namespaceMatch, line: lineNumber });
    }
  }

  return { usings, namespaces };
}
