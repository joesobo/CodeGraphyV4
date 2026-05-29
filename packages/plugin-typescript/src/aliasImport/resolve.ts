import * as path from 'node:path';
import type { TypeScriptAliasConfig } from './config';
import { resolveExistingFile } from './fileCandidates';
import type { TypeScriptPathMapping } from './pathMapping';

export function resolveAliasImport(
  specifier: string,
  config: TypeScriptAliasConfig,
): string | null {
  for (const mapping of config.paths) {
    for (const target of mapping.targets) {
      const resolved = resolvePathMappingTarget(specifier, mapping, target);
      if (resolved) {
        return resolved;
      }
    }
  }

  return null;
}

function resolvePathMappingTarget(
  specifier: string,
  mapping: TypeScriptPathMapping,
  target: string,
): string | null {
  if (!mapping.key.includes('*')) {
    return specifier === mapping.key ? resolveExistingFile(path.resolve(mapping.baseUrl, target)) : null;
  }

  const [prefix, suffix] = mapping.key.split('*');
  if (suffix === undefined || !specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
    return null;
  }

  const matched = specifier.slice(prefix.length, specifier.length - suffix.length);
  return resolveExistingFile(path.resolve(mapping.baseUrl, target.replace('*', matched)));
}
