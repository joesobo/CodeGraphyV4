import type { IDetectedUsing } from './parserTypes';

export function parseUsingDirective(line: string): Omit<IDetectedUsing, 'line'> | null {
  const usingRegex = /^(global\s+)?using\s+(static\s+)?(?:(\w+)\s*=\s*)?([\w.]+)\s*;\s*$/;
  const match = line.match(usingRegex);
  if (!match) {
    return null;
  }

  return {
    namespace: match[4],
    alias: match[3] || undefined,
    isStatic: !!match[2],
    isGlobal: !!match[1],
  };
}
