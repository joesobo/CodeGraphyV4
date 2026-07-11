import type { IFileAnalysisResult } from '@codegraphy-dev/plugin-api';
import { clearTypeScriptAliasConfigCache, readTypeScriptAliasConfig } from './compilerOptions';
import { collectTypeScriptFilePaths, isTypeScriptConfigFile, isTypeScriptSourceFile } from './files';
import { resolveAliasImport } from './resolve';
import { extractModuleSpecifiers } from './specifiers';
import { TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE } from './contribution';

const COMPILER_OPTIONS_PATHS_SOURCE_ID = 'compiler-options-paths';

export {
  clearTypeScriptAliasConfigCache,
  collectTypeScriptFilePaths,
  isTypeScriptConfigFile,
  isTypeScriptSourceFile,
};

export async function analyzeTypeScriptAliasImports(
  filePath: string,
  content: string,
  workspaceRoot: string,
): Promise<IFileAnalysisResult> {
  if (!isTypeScriptSourceFile(filePath)) {
    return { filePath, relations: [] };
  }

  const config = readTypeScriptAliasConfig(filePath, workspaceRoot);
  if (!config) {
    return { filePath, relations: [] };
  }

  return {
    filePath,
    relations: extractModuleSpecifiers(filePath, content)
      .map(specifier => ({
        specifier,
        resolvedPath: resolveAliasImport(specifier, config),
      }))
      .filter((relation): relation is { specifier: string; resolvedPath: string } => Boolean(relation.resolvedPath))
      .map(relation => ({
        kind: TYPESCRIPT_ALIAS_IMPORT_EDGE_TYPE.id,
        sourceId: COMPILER_OPTIONS_PATHS_SOURCE_ID,
        fromFilePath: filePath,
        toFilePath: relation.resolvedPath,
        resolvedPath: relation.resolvedPath,
        specifier: relation.specifier,
    })),
  };
}
