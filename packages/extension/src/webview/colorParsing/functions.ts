export interface CssColorFunction {
  args: string[];
  name: string;
}

function isLowercaseAsciiLetter(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 97 && code <= 122;
}

function isFunctionName(name: string): boolean {
  return [...name].every(isLowercaseAsciiLetter);
}

export function parseCssColorFunction(color: string): CssColorFunction | null {
  const trimmed = color.trim();
  const openParenIndex = trimmed.indexOf('(');

  if (openParenIndex < 1 || !trimmed.endsWith(')')) {
    return null;
  }

  const name = trimmed.slice(0, openParenIndex).trim().toLowerCase();
  if (!isFunctionName(name)) {
    return null;
  }

  return {
    args: trimmed
      .slice(openParenIndex + 1, -1)
      .split(',')
      .map((arg) => arg.trim()),
    name,
  };
}
