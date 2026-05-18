export function trimGodotTextLine(line: string): string {
  return line.trim();
}

export function isIgnoredGodotLine(line: string): boolean {
  return line.length === 0 || line.startsWith(';');
}
