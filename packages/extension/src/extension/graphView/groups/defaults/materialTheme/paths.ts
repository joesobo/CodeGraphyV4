import * as path from 'node:path';

export function normalizePathSeparators(value: string): string {
  return value.replace(/\\/g, '/');
}

export function getMaterialBaseName(value: string): string {
  return path.posix.basename(normalizePathSeparators(value));
}
