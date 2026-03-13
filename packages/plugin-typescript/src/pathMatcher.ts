import * as path from 'path';
import { resolveFile } from './fileResolver';

export function matchPathPattern(specifier: string, pattern: string): string | null {
  if (pattern.includes('*')) {
    const [prefix, suffix] = pattern.split('*');
    if (specifier.startsWith(prefix) && specifier.endsWith(suffix || '')) {
      return specifier.slice(prefix.length, suffix ? -suffix.length || undefined : undefined);
    }
  } else if (specifier === pattern) {
    return '';
  }
  return null;
}

export function resolveWithPaths(
  specifier: string,
  paths: Record<string, string[]> | undefined,
  baseUrl: string
): string | null {
  if (!paths) return null;

  for (const [pattern, targets] of Object.entries(paths)) {
    const match = matchPathPattern(specifier, pattern);
    if (match !== null) {
      for (const target of targets) {
        const resolvedTarget = target.replace('*', match);
        const fullPath = path.resolve(baseUrl, resolvedTarget);
        const resolved = resolveFile(fullPath);
        if (resolved) {
          return resolved;
        }
      }
    }
  }

  return null;
}
