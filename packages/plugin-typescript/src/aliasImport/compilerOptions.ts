import type { TypeScriptPathMapping } from './pathMapping';
import { clearCompilerOptionsCache, readCompilerOptions } from './config/cache';
import { findNearestTypeScriptConfig } from './config/discovery';
import { createPathMappings } from './config/pathMappings';

export type TypeScriptAliasConfig = {
  paths: TypeScriptPathMapping[];
};

export function clearTypeScriptAliasConfigCache(): void {
  clearCompilerOptionsCache();
}

export function readTypeScriptAliasConfig(filePath: string, workspaceRoot: string): TypeScriptAliasConfig | null {
  const tsconfigPath = findNearestTypeScriptConfig(filePath, workspaceRoot);
  if (!tsconfigPath) {
    return null;
  }

  const parsed = readCompilerOptions(tsconfigPath);
  if (!parsed?.options.paths) {
    return null;
  }

  return {
    paths: createPathMappings(parsed.options.paths, parsed.options, tsconfigPath, workspaceRoot),
  };
}
