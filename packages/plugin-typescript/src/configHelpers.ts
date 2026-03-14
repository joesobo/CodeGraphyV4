/**
 * @fileoverview Pure helper functions for parsing tsconfig/jsconfig data structures.
 * @module plugins/typescript/configHelpers
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getCompilerOptions(config: unknown): Record<string, unknown> {
  if (!isRecord(config)) return {};
  const compilerOptions = config.compilerOptions;
  return isRecord(compilerOptions) ? compilerOptions : {};
}

export function getBaseUrl(compilerOptions: Record<string, unknown>): string | undefined {
  const baseUrl = compilerOptions.baseUrl;
  return typeof baseUrl === 'string' ? baseUrl : undefined;
}

export function getPaths(
  compilerOptions: Record<string, unknown>
): Record<string, string[]> | undefined {
  const paths = compilerOptions.paths;
  if (!isRecord(paths)) return undefined;

  const entries: Array<[string, string[]]> = [];

  for (const [alias, targetValue] of Object.entries(paths)) {
    if (!Array.isArray(targetValue)) return undefined;
    if (!targetValue.every((item) => typeof item === 'string')) return undefined;
    entries.push([alias, targetValue]);
  }

  return Object.fromEntries(entries);
}
