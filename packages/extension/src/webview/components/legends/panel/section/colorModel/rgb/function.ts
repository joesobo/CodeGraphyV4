export function splitColorFunction(color: string): string[] | null {
  const trimmedColor = color.trim();
  if (!trimmedColor.endsWith(')')) {
    return null;
  }

  const openingIndex = trimmedColor.indexOf('(');
  const functionName = trimmedColor.slice(0, openingIndex).toLowerCase();
  if (functionName !== 'rgb' && functionName !== 'rgba') {
    return null;
  }

  return trimmedColor
    .slice(openingIndex + 1, -1)
    .split(',')
    .map((part) => part.trim());
}
