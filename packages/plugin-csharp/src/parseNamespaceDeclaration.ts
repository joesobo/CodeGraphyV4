import type { IDetectedNamespace } from './parserTypes';

export function parseNamespaceDeclaration(line: string): Omit<IDetectedNamespace, 'line'> | null {
  const fileScopedMatch = line.match(/^namespace\s+([\w.]+)\s*;\s*$/);
  if (fileScopedMatch) {
    return {
      name: fileScopedMatch[1],
      isFileScoped: true,
    };
  }

  const blockScopedMatch = line.match(/^namespace\s+([\w.]+)\s*\{?\s*$/);
  if (blockScopedMatch) {
    return {
      name: blockScopedMatch[1],
      isFileScoped: false,
    };
  }

  return null;
}
