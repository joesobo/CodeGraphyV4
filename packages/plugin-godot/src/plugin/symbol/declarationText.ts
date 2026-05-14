export interface GDScriptDeclaration {
  kind: string;
  name: string;
  signature: string;
}

const DECORATOR_PATTERN = /^@\w+(?:\([^)]*\))?\s+/;

const DECLARATION_PATTERNS = [
  { kind: 'function', pattern: /^(?:static\s+)?func\s+([A-Za-z_]\w*)\b/ },
  { kind: 'constant', pattern: /^const\s+([A-Za-z_]\w*)\b/ },
  { kind: 'variable', pattern: /^var\s+([A-Za-z_]\w*)\b/ },
  { kind: 'enum', pattern: /^enum\s+([A-Za-z_]\w*)\b/ },
] as const;

export function readGDScriptDeclaration(
  trimmedLine: string,
): GDScriptDeclaration | null {
  const signature = trimmedLine.replace(DECORATOR_PATTERN, '');

  for (const { kind, pattern } of DECLARATION_PATTERNS) {
    const match = signature.match(pattern);
    if (match) {
      return {
        kind,
        name: match[1],
        signature,
      };
    }
  }

  return null;
}
